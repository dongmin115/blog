import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, basename, extname } from 'node:path';
import { parseFrontmatter } from './frontmatter.ts';
import { mdToHtml, plain } from './markdown.ts';

export interface Category { name: string; sub: string; hue: number; sat: number }
export interface Post {
  id: string; title: string; date: string; category: string; photo: string | null;
  excerpt: string; minutes: number; html: string;
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-+|-+$/g, '');

export function loadPosts(dir: string): Post[] {
  if (!existsSync(dir)) return [];
  const posts: Post[] = [];
  for (const f of readdirSync(dir).filter((x) => extname(x) === '.md')) {
    const { meta, body } = parseFrontmatter(readFileSync(join(dir, f), 'utf8'));
    if (meta.draft === true) continue;
    const base = basename(f, '.md');
    const dm = String(meta.date || base.slice(0, 10)).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!dm) { console.warn(`건너뜀(날짜 없음): ${f}`); continue; }
    const text = plain(body);
    posts.push({
      id: String(meta.id || slugify(base) || base),
      title: String(meta.title || base),
      date: `${dm[1]}-${dm[2]}-${dm[3]}`,
      category: String(meta.category || '기록'),
      photo: meta.photo ? String(meta.photo) : null,
      excerpt: text.length > 140 ? text.slice(0, 140).trim() + '…' : text,
      minutes: Math.max(1, Math.ceil(text.length / 450)),
      html: mdToHtml(body),
    });
  }
  const ids = new Set<string>();
  for (const p of posts) {
    if (ids.has(p.id)) throw new Error(`글 id가 겹쳐요: ${p.id}`);
    ids.add(p.id);
  }
  return posts.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export function loadCategories(file: string, posts: Post[]): Category[] {
  const cats: Category[] = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
  const seen = new Set(cats.map((c) => c.name));
  for (const p of posts) {
    if (seen.has(p.category)) continue;
    seen.add(p.category);
    cats.push({ name: p.category, sub: '', hue: (cats.length * 67 + 200) % 360, sat: 65 });
  }
  return cats;
}
