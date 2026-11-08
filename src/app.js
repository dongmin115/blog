// 앱 셸: 공통 UI(탭, 카드, 힌트)와 테마 로더. 테마는 ./themes/*.js 에 있고 같은 데이터를 받아 그려요.
import { SITE_TITLE, SITE_SUB } from './config.js';

const $ = (id) => document.getElementById(id);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// 테마 목록. 새 테마는 여기에 한 줄 추가하면 탭에 나타나요.
const THEMES = [
  { id: 'space', label: '우주', load: () => import('./themes/space.js') },
  { id: 'list', label: '목록', load: () => import('./themes/list.js') },
];

let liked = {};
try { liked = JSON.parse(localStorage.getItem('blog-liked') || '{}') || {}; } catch { liked = {}; }
const saveLiked = () => { try { localStorage.setItem('blog-liked', JSON.stringify(liked)); } catch { /* 저장 불가 */ } };

let data = null, current = null, backFn = null, cardPost = null, cardClose = null, token = 0;

export const ui = {
  setSub(t) { $('sub').textContent = t || SITE_SUB; },
  setBack(fn) { backFn = fn || null; $('back').hidden = !fn; },
  setHint(t) { const h = $('hint'); h.textContent = t || ''; h.classList.toggle('off', !t); },
  showPost(p, opts = {}) {
    const c = data.cats[p.cat];
    cardPost = p; cardClose = opts.onClose || null;
    $('mcat').textContent = c.name; $('mcat').style.color = `hsl(${c.h},${c.s}%,72%)`;
    $('mdate').textContent = `${p.m}월 ${p.d}일`; $('mread').textContent = `· ${p.minutes}분`;
    $('mtitle').textContent = p.title; $('mtext').textContent = p.excerpt;
    $('mviews').textContent = p.views ? `조회 ${p.views}` : '';
    const img = $('photo');
    if (p.photo) { img.src = p.photo; img.hidden = false; } else { img.hidden = true; img.removeAttribute('src'); }
    $('mread-link').href = p.url;
    renderLike();
    $('card').classList.add('open');
  },
  hidePost() { $('card').classList.remove('open'); cardPost = null; cardClose = null; },
  fail(msg) { $('noglmsg').textContent = msg; $('nogl').hidden = false; },
};

function renderLike() {
  if (!cardPost) return;
  const on = !!liked[cardPost.id], n = (cardPost.likes || 0) + (on ? 1 : 0);
  $('mlike').textContent = `${on ? '♥' : '♡'} ${n || ''}`.trim();
  $('mlike').classList.toggle('on', on);
}
$('mlike').addEventListener('click', () => {
  if (!cardPost) return;
  if (liked[cardPost.id]) delete liked[cardPost.id]; else liked[cardPost.id] = true;
  saveLiked(); renderLike();
});
$('mclose').addEventListener('click', () => { const f = cardClose; ui.hidePost(); if (f) f(); });
$('back').addEventListener('click', () => { if (backFn) backFn(); });

async function loadData() {
  const res = await fetch('./posts.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('posts.json');
  const raw = await res.json();
  const cats = raw.categories.map((c) => ({ name: c.name, sub: c.sub || '', h: c.hue, s: c.sat }));
  const posts = raw.posts.map((p) => {
    const [, m, d] = p.date.split('-').map(Number);
    return { id: p.id, title: p.title, date: p.date, m, d, cat: cats.findIndex((c) => c.name === p.category), excerpt: p.excerpt, minutes: p.minutes, photo: p.photo, url: p.url, likes: 0, views: 0 };
  }).filter((p) => p.cat >= 0);
  return { cats, posts, inCat: (i) => posts.filter((p) => p.cat === i) };
}

async function switchTheme(id) {
  const my = ++token;
  const t = THEMES.find((x) => x.id === id) || THEMES[0];
  if (current) { try { current.destroy(); } catch { /* 이미 정리됨 */ } current = null; }
  ui.hidePost(); ui.setBack(null); ui.setHint(''); ui.setSub(''); $('nogl').hidden = true;
  document.querySelectorAll('#tabs .btn').forEach((b) => b.classList.toggle('on', b.dataset.t === t.id));
  try {
    const mod = await t.load();
    if (my !== token) return;
    const inst = await mod.mount({ el: $('stage'), data, ui, reduce });
    if (my !== token) { inst.destroy(); return; }
    current = inst;
  } catch (e) {
    console.error(e);
    if (my !== token) return;
    if (t.id !== 'list') {
      ui.fail('이 기기에서는 이 화면을 열 수 없어서 목록으로 보여드려요.');
      const mod = await THEMES[1].load();
      current = await mod.mount({ el: $('stage'), data, ui, reduce });
    }
  }
}

function route() {
  const id = (location.hash || '').replace('#', '');
  switchTheme(THEMES.some((t) => t.id === id) ? id : THEMES[0].id);
}

async function init() {
  $('brand').textContent = SITE_TITLE; document.title = SITE_TITLE;
  const tabs = $('tabs');
  THEMES.forEach((t) => {
    const b = document.createElement('button');
    b.className = 'btn'; b.dataset.t = t.id; b.textContent = t.label;
    b.addEventListener('click', () => { if (location.hash !== '#' + t.id) location.hash = t.id; });
    tabs.appendChild(b);
  });
  try { data = await loadData(); }
  catch { ui.fail('글을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.'); return; }
  window.addEventListener('hashchange', route);
  route();
}
init();
