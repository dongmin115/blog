import type { BlogData, Cat, Post } from './types';

export interface Raw {
  categories: { name: string; hue: number; sat: number }[];
  posts: { id: string; title: string; date: string; category: string; excerpt: string; minutes: number; photo: string | null; url: string }[];
}

export async function loadData(): Promise<BlogData> {
  const res = await fetch('./posts.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('posts.json');
  return buildData(await res.json());
}

/** posts.json → 앱 데이터. 글은 항상 최신순(같은 날이면 파일 순서의 역순)이고, 테마는 이 순서를 그대로 써요. */
export function buildData(raw: Raw): BlogData {
  const cats: Cat[] = raw.categories.map((c) => ({ name: c.name, h: c.hue, s: c.sat }));
  const posts: Post[] = raw.posts
    .map((p, i) => ({ p, i }))
    .sort((a, b) => (a.p.date < b.p.date ? 1 : a.p.date > b.p.date ? -1 : b.i - a.i))
    .map(({ p }) => {
      const [y, m, d] = p.date.split('-').map(Number);
      return { id: p.id, title: p.title, date: p.date, y, m, d, cat: cats.findIndex((c) => c.name === p.category), excerpt: p.excerpt, minutes: p.minutes, photo: p.photo, url: p.url, likes: 0, views: 0 };
    })
    .filter((p) => p.cat >= 0);
  return { cats, posts, inCat: (i) => posts.filter((p) => p.cat === i) };
}
