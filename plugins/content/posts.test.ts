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

async function withDir(files: Record<string, string>, run: (dir: string) => void) {
  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const dir = mkdtempSync(join(tmpdir(), 'blog-posts-'));
  try {
    for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body);
    run(dir);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('숫자 파일 이름이 id가 되고, 날짜는 머리말 date만 따라요', async () => {
  await withDir({ '5.md': '---\ntitle: 옛 생각\ndate: 2022-12-24\n---\n본문' }, (dir) => {
    const [p] = loadPosts(dir);
    expect(p.id).toBe('5');
    expect(p.date).toBe('2022-12-24');
  });
});

test('머리말 id가 있으면 파일 이름보다 우선해요', async () => {
  await withDir({ 'draft-name.md': '---\nid: 7\ntitle: a\ndate: 2026-09-14\n---\n본문' }, (dir) => {
    expect(loadPosts(dir)[0].id).toBe('7');
  });
});

test('숫자가 아닌 id와 겹치는 id는 빌드를 막아요', async () => {
  await withDir({ 'kyoto.md': '---\ntitle: a\ndate: 2026-09-14\n---\n본문' }, (dir) => {
    expect(() => loadPosts(dir)).toThrow(/숫자/);
  });
  await withDir({ '1.md': '---\ntitle: a\ndate: 2026-09-14\n---\n', 'x.md': '---\nid: 1\ntitle: b\ndate: 2026-09-15\n---\n' }, (dir) => {
    expect(() => loadPosts(dir)).toThrow(/겹쳐요/);
  });
});
