import { expect, test } from 'vitest';
import { buildData, type Raw } from './loadData';

const post = (id: string, date: string, category: string) => ({ id, title: id, date, category, excerpt: '', minutes: 1, photo: null, url: `posts/${id}/` });
const raw: Raw = {
  categories: [{ name: 'A', hue: 10, sat: 50 }, { name: 'B', hue: 20, sat: 50 }],
  posts: [post('old', '2026-01-02', 'A'), post('mid-1', '2026-05-01', 'B'), post('mid-2', '2026-05-01', 'A'), post('new', '2026-09-09', 'A'), post('ghost', '2026-10-10', '없는 카테고리')],
};

test('글은 최신순이고, 같은 날이면 나중 파일이 먼저예요', () => {
  expect(buildData(raw).posts.map((p) => p.id)).toEqual(['new', 'mid-2', 'mid-1', 'old']);
});

test('카테고리 안에서도 최신순을 유지해요', () => {
  const d = buildData(raw);
  expect(d.inCat(0).map((p) => p.id)).toEqual(['new', 'mid-2', 'old']);
  expect(d.inCat(1).map((p) => p.id)).toEqual(['mid-1']);
});

test('연도를 따로 들고 있어요(과거 글 표시용)', () => {
  const d = buildData({ categories: [{ name: 'A', hue: 1, sat: 1 }], posts: [post('a', '2022-12-24', 'A')] });
  expect(d.posts[0]).toMatchObject({ y: 2022, m: 12, d: 24 });
});
