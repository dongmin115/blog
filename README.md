# blog

살면서 느끼고 생각한 것들의 기록. 글은 `content/posts/*.md`에 마크다운으로 쓰고, GitHub Pages로 배포해요.

## 글 쓰기

`content/posts/2026-11-08-제목.md`

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

- 글 id는 파일 이름에서 만들어져요. **한 번 정하면 바꾸지 마세요.** (좋아요/조회수가 이 id에 붙어요)
- 카테고리는 `content/categories.json`에서 순서와 색을 정해요. 목록에 없는 카테고리는 자동으로 추가돼요.
- 사진은 `public/photos/`에 넣고 `photo:`에 경로를 적어요.

## 로컬에서 보기

```
npm run dev     # http://localhost:4173
npm test
npm run build   # dist/ 생성
```

의존성이 없어서 `npm install`이 필요 없어요. (Node 20 이상)

## 구조

```
content/            글과 카테고리 설정
scripts/build.mjs   content → dist (posts.json, 글 페이지)
src/app.js          공통 UI와 테마 로더
src/themes/         테마 모듈 (space, list, ...) — 같은 글 데이터를 서로 다르게 그려요
public/             그대로 복사되는 정적 파일(사진 등)
```

새 테마는 `src/themes/<이름>.js`에 `export async function mount({ el, data, ui, reduce })`를 만들고,
`src/app.js`의 `THEMES`에 한 줄 추가하면 탭에 나타나요. `mount`는 `{ destroy() }`를 돌려줘야 해요.

## 배포

`main`에 push하면 GitHub Actions가 빌드해서 Pages에 올려요.
저장소 Settings → Pages → Source를 **GitHub Actions**로 바꿔 주세요.
