import { esc } from './markdown.ts';
import type { Category, Post } from './posts.ts';

// 좋아요(지금은 이 기기에만 저장): 앱의 글 카드(src/components/PostCard/useLiked.ts)와 같은 저장소 키를 써서
// 두 곳의 좋아요 상태가 이어져요. 서버를 붙이면 둘 다 같이 바꿔야 해요.
const LIKE_SCRIPT = `(function(){var b=document.getElementById('like'),id=b.dataset.id,K='blog-liked';
function read(){try{return JSON.parse(localStorage.getItem(K)||'{}')||{}}catch(e){return{}}}
function draw(){var on=!!read()[id];b.setAttribute('aria-pressed',on);b.classList.toggle('on',on);b.textContent=on?'♥ 1':'♡'}
b.addEventListener('click',function(){var m=read();if(m[id])delete m[id];else m[id]=true;try{localStorage.setItem(K,JSON.stringify(m))}catch(e){}draw()});
draw()})();`;

// 글 한 편의 정적 페이지(검색엔진/공유용). rel은 이 페이지에서 사이트 루트까지의 상대 경로예요.
export function postPage(p: Post, cat: Category, rel: string, baseUrl: string) {
  const date = p.date.replace(/-/g, '.');
  const url = baseUrl ? `${baseUrl}/posts/${p.id}/` : '';
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<link rel="icon" href="data:,"><title>${esc(p.title)}</title><meta name="description" content="${esc(p.excerpt)}">
<meta property="og:title" content="${esc(p.title)}"><meta property="og:description" content="${esc(p.excerpt)}">${url ? `<meta property="og:url" content="${url}">` : ''}
<link rel="stylesheet" href="${rel}post.css"></head>
<body><main><a class="back" href="${rel}#space">← 우주로 돌아가기</a>
<p class="meta"><span style="color:hsl(${cat.hue},${cat.sat}%,72%)">${esc(p.category)}</span> · ${date} · ${p.minutes}분</p>
<h1>${esc(p.title)}</h1>${p.photo ? `<img class="hero" src="${rel}${esc(p.photo)}" alt="">` : ''}
<article>${p.html}</article>
<div class="actions"><button type="button" class="like" id="like" data-id="${esc(p.id)}" aria-pressed="false">♡</button></div></main>
<script>${LIKE_SCRIPT}</script></body></html>`;
}
