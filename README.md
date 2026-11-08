# blog

살면서 느끼고 생각한 것들의 기록. 글은 `content/posts/*.md`에 마크다운으로 쓰고, GitHub Pages로 배포해요.

## 글 쓰기

`content/posts/<번호>.md` (예: `1.md`, `2.md`, …)

```md
---
title: 글 제목
date: 2026-11-08
category: 기록
photo: photos/example.webp   # 선택
draft: true                  # 선택: 사이트에 안 보이게
---

본문을 마크다운으로 써요.
```

- **날짜는 직접 정해요.** 옛 생각을 쓸 때는 그 생각이 어울리는 날짜를 `date:`에 적으세요(파일 이름의 날짜보다 `date:`가 우선이에요). 그 날짜로 정렬되고, 숲의 깊이와 반딧불 색(계절)이 정해져요. 올해가 아닌 글은 연도가 같이 표시돼요.
- 글 id(=주소 `/posts/<id>/`)는 **숫자**예요. 파일 이름이 그대로 id가 돼요(`1.md` → `/posts/1/`). 새 글은 가장 큰 번호 + 1을 쓰세요. 번호는 날짜와 상관없고, 글을 지워서 비는 번호는 다시 쓰지 마세요. **한 번 공개하면 바꾸지 마세요.** (좋아요/조회수가 이 id에 붙어요)
- id가 숫자가 아니거나 겹치면 빌드가 멈춰요. 머리말에 `id:`를 적으면 파일 이름 대신 그 값을 써요(역시 숫자). 머리말 `date:`는 꼭 필요해요.
- 카테고리는 `content/categories.json`에서 순서와 색을 정해요. 목록에 없는 카테고리는 자동으로 추가돼요.
- 사진은 `public/photos/`에 넣고 `photo:`에 경로를 적어요.

## 로컬에서 보기

```bash
pnpm install
pnpm dev         # http://localhost:4173
pnpm test        # vitest
pnpm typecheck
pnpm build       # dist/ 생성
```

Node 20.19 이상이 필요해요(`.nvmrc`는 24). 글(`content/`)을 고치면 개발 서버가 자동으로 새로고침돼요.

## 구조 (co-location)

```
content/                 글과 카테고리 설정
plugins/content/         content → posts.json, 글 페이지를 만드는 Vite 플러그인(+테스트)
src/app/                 App과 전역 스타일
src/components/<Name>/   컴포넌트마다 tsx + css (+ 테스트)를 한 폴더에
src/data/                글 데이터 타입과 불러오기
src/themes/<id>/         테마마다 폴더 하나 — 같은 글 데이터를 서로 다르게 그려요
public/                  그대로 복사되는 정적 파일(사진 등)
```

새 테마는 `src/themes/<이름>/`에 컴포넌트와 `index.ts`를 만들고,
`src/themes/registry.ts`의 `THEMES`에 한 줄 추가하면 상단 오른쪽 테마 선택에 아이콘이 나타나요.
테마는 `({ data, ui, reduce, onUnsupported })`를 받는 React 컴포넌트예요(`src/themes/types.ts`).

## 배포

`main`에 push하면 GitHub Actions가 빌드해서 Pages에 올려요.
저장소 Settings → Pages → Source를 **GitHub Actions**로 바꿔 주세요.
