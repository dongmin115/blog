import { join } from 'node:path';
import { expect, test } from 'vitest';
import { loadCategories, loadPosts } from './posts.ts';

const content = join(import.meta.dirname, '..', '..', 'content');

test('샘플 글을 읽고 id가 겹치지 않아요', () => {
  const posts = loadPosts(join(content, 'posts'));
  expect(posts.length).toBeGreaterThanOrEqual(1);
  expect(posts.every((p) => p.id && /^\d{4}-\d{2}-\d{2}$/.test(p.date))).toBe(true);
  expect(new Set(posts.map((p) => p.id)).size).toBe(posts.length);
});

test('카테고리 목록에 없는 글의 카테고리는 자동으로 추가돼요', () => {
  const posts = loadPosts(join(content, 'posts'));
  const cats = loadCategories(join(content, 'categories.json'), posts);
  for (const p of posts) expect(cats.some((c) => c.name === p.category)).toBe(true);
});

test('머리말 date가 파일 이름 날짜보다 우선하고, id는 파일 이름에서만 만들어요', async () => {
  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const dir = mkdtempSync(join(tmpdir(), 'blog-posts-'));
  try {
    writeFileSync(join(dir, '2026-11-08-old-thought.md'), '---\ntitle: 옛 생각\ndate: 2022-12-24\n---\n본문');
    const [p] = loadPosts(dir);
    expect(p.date).toBe('2022-12-24');
    expect(p.id).toBe('2026-11-08-old-thought');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
