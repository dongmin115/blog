# blog — 프로젝트 맥락 (새 세션은 이 파일부터 읽으세요)

> 더 자세한 배경과 시행착오는 **`docs/DECISIONS.md`**에 있어요. 작업 전에 같이 읽으세요.

주인: dongmin115 (카카오페이증권 프론트엔드 개발자, 아이폰 사용, 한국어로 대화).
개인 블로그/일기장. "살면서 느끼고 생각한 것들의 기록". GitHub Pages로 **공개** 배포. 폰에서 글을 쓰고 올리는 게 핵심이에요.

## 지금까지 정한 것

- **스택**: **pnpm + Vite + React + TypeScript**(Node 20.19+, `.nvmrc`=24). 글(마크다운)과 테마를 분리하고, 같은 글 데이터를 여러 테마가 다르게 그려요. `content/*.md` → `posts.json`/글 페이지는 Vite 플러그인(`plugins/content/`)이 dev와 build 양쪽에서 만들어요.
- **co-location 구조**: 컴포넌트/테마마다 폴더 하나에 `.tsx`, `.css`, 테스트, 아이콘을 같이 둬요. `src/components/<Name>/`, `src/themes/<id>/`, 공용 아이콘은 `src/components/icons.tsx`, 전역 토큰은 `src/app/global.css`.
- **테마 인터페이스**: 테마는 React 컴포넌트 `({ data, ui, reduce, onUnsupported })`(`src/themes/types.ts`). 폴더에 `index.ts`(id, name, Icon, lazy Component)를 만들고 `src/themes/registry.ts`의 `THEMES`에 한 줄 추가하면 선택창에 나와요. 캔버스/3D 테마는 `<div ref>`에 effect로 장면을 올리고 cleanup에서 정리해요(`space/SpaceTheme.tsx` + `scene.ts` 참고). WebGL을 못 쓰면 `onUnsupported()`를 불러요.
- **테마 선택 UI**: 상단 오른쪽 작은 아이콘 버튼(`ThemePicker`). 누르면 테마 아이콘들이 펼쳐지고, 글자는 없어요(접근성 라벨만). 예전 탭 줄은 없앴어요.
- **최종 테마 후보(2개만 남김)**: ① 우주(통합: 별자리 + 행성) — 구현됨(`src/themes/space/`, three 최신판을 npm으로 사용. r128 때의 색감을 유지하려고 `scene.ts`에서 색 관리를 끄고 조명 세기에 π를 곱했어요) ② 반딧불 숲 — 구현됨(`src/themes/forest/`, 캔버스 2D, `reference/forest-demo.html`에서 이식). 도서관, 지층, 유리병 테마는 버렸어요.
- **글 배치**: 글은 어디서나 **최신순**(정렬은 `src/data/loadData.ts`의 `buildData` 한 곳, 테스트 있음). 입구/첫 칸에 가장 최근 글이 와요. 반딧불 숲 1뎁스 맨 앞에는 모든 글을 시간순으로 보는 **'전체'** 이정표가 있어요(우주/목록에는 아직 없음).
- **날짜**: 글마다 `date`를 주인이 직접 찍어요(과거 생각도 어울리는 날짜로). `date`가 파일 이름 날짜보다 우선, id는 파일 이름에서만. 별도의 '쓴 날/그때' 구분은 두지 않기로 했어요. 연도가 올해와 다르면 카드/라벨에 연도를 보여줘요.
- **카테고리**: 1뎁스(전체) → 2뎁스(카테고리 안) → 글. `content/categories.json`에서 이름/색/순서 설정.
- **글 id는 파일 이름에서 만들어지고, 한 번 정하면 바꾸지 않아요**(좋아요/조회수가 붙음).
- **좋아요/조회수**: 로그인 없이 익명. 서버 1대(글 id → likes/views) + 기기별 localStorage 중복 방지 + 간단한 rate-limit/IP 해시. 서버는 Cloudflare Workers(무료)로 가려고 했고, 아직 안 만들었어요. `src/config.ts`의 `API_URL`이 비어 있으면 이 기기에만 저장돼요. 분석 도구(GoatCounter/Cloudflare Web Analytics)는 별도.
- **사진**: 선택. 올릴 때 폰에서 줄여서(긴 변 약 1600px, WebP) `public/photos/`에 저장하고 글 머리에 `photo:`로 적어요.
- **디자인 취향**: 눈이 즐겁고 몰입되며, 부드러워야 해요(프레임 드랍 금지). 알록달록한 건 싫어해요. 도형 같은 건 싫어하고, 실제 사물처럼 질감 있는 걸 좋아해요. 모든 화면은 가로 스크롤 없이 한 화면 너비에 맞아야 해요.

## 반딧불 숲 테마(이식 완료. 고칠 때 참고)

원본 데모는 **`reference/forest-demo.html`**(단일 HTML, `ForestTheme` 함수 + 공통 입력/카드 코드)에 있어요. 우주 3D 데모는 `reference/space-demo.html`이에요. 이 파일들은 참고용이고 배포되지 않아요. 요점:
- 캔버스 2D, 라이브러리 없음. 원근 투영(s = F/zr, F=420, 카메라 높이 70, 수평선 hy = vh*0.4), 안개 색 보간, 나무가 다가오며 자라나는 효과.
- 보트가 물 위를 앞으로 가요. **아래로 끌면 앞으로**(invertY). 깊이 표시가 오른쪽에 있어요.
- 1뎁스: 숲 안쪽으로 들어가며 깊이마다 이정표(나무판 질감, 못, 이끼, 위에 등불, 판은 안쪽 위로 기울어짐, 색은 단색) 하나씩 — 누르면 그 카테고리로. 2뎁스: 글이 반딧불, 누르면 카드.
- 2뎁스의 호수 같은 물 + 큰 나무 줄기 모습을 좋아해요. 길과 물을 따로 그리지 마세요(점선, 스포트라이트 빛 금지).
- 이정표 글씨체는 붓글씨 느낌의 `East Sea Dokdo`를 쓰고 있었어요.

## 해야 할 일 (순서)

1. (완료) 반딧불 숲 이식. 폰에서 프레임/터치감을 눈으로 확인하고 다듬기 — 글 카드의 이전/다음, 사진 올려 보기는 원본 데모에 있었지만 아직 안 옮김
2. 폰 글쓰기 화면(PWA): GitHub API로 `content/posts/*.md`와 사진을 커밋. 로그인 방식은 GitHub 토큰을 기기에 저장하는 쪽을 먼저 고려해요.
3. 좋아요/조회수 서버(Cloudflare Worker + KV 또는 D1)와 `API_URL` 연결
4. Pages 배포 설정(Settings → Pages → Source = GitHub Actions)
5. WebGL을 못 쓰는 기기를 위한 대체 화면(`src/themes/list/`)은 있어요. 접근성과 SEO 점검은 남았어요.

## 작업 규칙

- 패키지 매니저는 **pnpm**이에요. `pnpm test`(vitest), `pnpm typecheck`, `pnpm build`가 통과해야 해요. `pnpm dev`는 http://localhost:4173.
- 모바일(390×780)에서 눈으로 확인하고, 가로 스크롤이 생기면 안 돼요.
- 커밋/푸시는 요청받았을 때만 해요.
