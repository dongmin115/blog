// 의존성 없는 빌드: content/ → dist/
// 사용법: node scripts/build.mjs  (BASE_URL 환경변수로 사이트 주소를 줄 수 있어요)
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync, cpSync, statSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'dist');
const BASE_URL = (process.env.BASE_URL || '').replace(/\/$/, '');

/* ---------- frontmatter ---------- */
export function parseFrontmatter(raw) {
  const m = raw.replace(/^﻿/, '').match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: raw };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const mm = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!mm) continue;
    let v = mm[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (v === 'true') v = true; else if (v === 'false') v = false;
    meta[mm[1]] = v;
  }
  return { meta, body: m[2] };
}

/* ---------- 아주 작은 마크다운 ---------- */
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function inline(s) {
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
  s = esc(s);
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, a, u) => `<img src="${safeUrl(u)}" alt="${a}" loading="lazy">`);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => `<a href="${safeUrl(u)}" rel="noopener">${t}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${esc(codes[+i])}</code>`);
}
function safeUrl(u) { return /^(https?:|\/|\.|#|mailto:)/i.test(u) || !/^[a-z]+:/i.test(u) ? u : '#'; }
export function mdToHtml(src) {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++; out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`); continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) { const n = Math.min(h[1].length + 1, 5); out.push(`<h${n}>${inline(h[2])}</h${n}>`); i++; continue; }
    if (/^---+\s*$/.test(line)) { out.push('<hr>'); i++; continue; }
    if (/^>\s?/.test(line)) {
      const buf = []; while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      out.push(`<blockquote>${inline(buf.join(' '))}</blockquote>`); continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const buf = []; while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) buf.push(`<li>${inline(lines[i++].replace(/^\s*[-*]\s+/, ''))}</li>`);
      out.push(`<ul>${buf.join('')}</ul>`); continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const buf = []; while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) buf.push(`<li>${inline(lines[i++].replace(/^\s*\d+\.\s+/, ''))}</li>`);
      out.push(`<ol>${buf.join('')}</ol>`); continue;
    }
    if (!line.trim()) { i++; continue; }
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^(```|#{1,4}\s|>|---+\s*$|\s*[-*]\s+|\s*\d+\.\s+)/.test(lines[i])) buf.push(lines[i++]);
    out.push(`<p>${inline(buf.join('\n')).replace(/\n/g, '<br>')}</p>`);
  }
  return out.join('\n');
}
const plain = (md) => md.replace(/```[\s\S]*?```/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[#>*_`-]/g, ' ').replace(/\s+/g, ' ').trim();

/* ---------- 글 읽기 ---------- */
function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-+|-+$/g, ''); }
export function loadPosts(dir = join(ROOT, 'content', 'posts')) {
  if (!existsSync(dir)) return [];
  const posts = [];
  for (const f of readdirSync(dir).filter((x) => extname(x) === '.md')) {
    const { meta, body } = parseFrontmatter(readFileSync(join(dir, f), 'utf8'));
    if (meta.draft === true) continue;
    const base = basename(f, '.md');
    const dm = String(meta.date || base.slice(0, 10)).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!dm) { console.warn(`건너뜀(날짜 없음): ${f}`); continue; }
    const date = `${dm[1]}-${dm[2]}-${dm[3]}`;
    const text = plain(body);
    posts.push({
      id: String(meta.id || slugify(base) || base),
      title: String(meta.title || base),
      date,
      category: String(meta.category || '기록'),
      photo: meta.photo ? String(meta.photo) : null,
      excerpt: text.length > 140 ? text.slice(0, 140).trim() + '…' : text,
      minutes: Math.max(1, Math.ceil(text.length / 450)),
      html: mdToHtml(body),
    });
  }
  const ids = new Set();
  for (const p of posts) { if (ids.has(p.id)) throw new Error(`글 id가 겹쳐요: ${p.id}`); ids.add(p.id); }
  return posts.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
function loadCategories(posts) {
  const f = join(ROOT, 'content', 'categories.json');
  let cats = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : [];
  const seen = new Set(cats.map((c) => c.name));
  for (const p of posts) if (!seen.has(p.category)) { seen.add(p.category); cats.push({ name: p.category, sub: '', hue: (cats.length * 67 + 200) % 360, sat: 65 }); }
  return cats;
}

/* ---------- 글 페이지 템플릿 ---------- */
function postPage(p, cat, rel) {
  const date = p.date.replace(/-/g, '.');
  const url = BASE_URL ? `${BASE_URL}/posts/${p.id}/` : '';
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

/* ---------- 빌드 ---------- */
export function build() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  for (const dir of ['src', 'public']) if (existsSync(join(ROOT, dir))) cpSync(join(ROOT, dir), OUT, { recursive: true });
  const posts = loadPosts();
  const categories = loadCategories(posts);
  const catOf = (p) => categories.find((c) => c.name === p.category);
  const slim = posts.map(({ html, ...rest }) => ({ ...rest, url: `posts/${rest.id}/` }));
  writeFileSync(join(OUT, 'posts.json'), JSON.stringify({ categories, posts: slim, built: new Date().toISOString() }));
  for (const p of posts) {
    const dir = join(OUT, 'posts', p.id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), postPage(p, catOf(p), '../../'));
  }
  writeFileSync(join(OUT, '.nojekyll'), '');
  console.log(`빌드 완료: 글 ${posts.length}편, 카테고리 ${categories.length}개 → dist/`);
  return { posts, categories };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) build();
