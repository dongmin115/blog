import { esc } from './markdown.ts';
import type { Category, Post } from './posts.ts';

// 글 한 편의 정적 페이지(검색엔진/공유용). rel은 이 페이지에서 사이트 루트까지의 상대 경로예요.
export function postPage(p: Post, cat: Category, rel: string, baseUrl: string) {
  const date = p.date.replace(/-/g, '.');
  const url = baseUrl ? `${baseUrl}/posts/${p.id}/` : '';
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(p.title)}</title><meta name="description" content="${esc(p.excerpt)}">
<meta property="og:title" content="${esc(p.title)}"><meta property="og:description" content="${esc(p.excerpt)}">${url ? `<meta property="og:url" content="${url}">` : ''}
<link rel="stylesheet" href="${rel}post.css"></head>
<body><main><a class="back" href="${rel}#space">← 우주로 돌아가기</a>
<p class="meta"><span style="color:hsl(${cat.hue},${cat.sat}%,72%)">${esc(p.category)}</span> · ${date} · ${p.minutes}분</p>
<h1>${esc(p.title)}</h1>${p.photo ? `<img class="hero" src="${rel}${esc(p.photo)}" alt="">` : ''}
<article>${p.html}</article></main></body></html>`;
}
