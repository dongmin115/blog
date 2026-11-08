import { expect, test } from 'vitest';
import { parseFrontmatter } from './frontmatter.ts';

test('머리말과 본문을 나눠요', () => {
  const { meta, body } = parseFrontmatter('---\ntitle: "안녕: 세상"\ndate: 2026-01-02\ndraft: true\n---\n본문');
  expect(meta.title).toBe('안녕: 세상');
  expect(meta.draft).toBe(true);
  expect(body).toBe('본문');
});
