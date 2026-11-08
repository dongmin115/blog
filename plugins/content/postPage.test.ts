import { expect, test } from 'vitest';
import { postPage } from './postPage.ts';

const post = { id: '7', title: '제목', date: '2026-09-13', category: '일상', photo: null, excerpt: '요약', minutes: 1, html: '<p>본문</p>' };
const cat = { name: '일상', hue: 35, sat: 88 };

test('글 페이지에 좋아요 버튼이 있고, 앱 카드와 같은 저장소 키를 써요', () => {
  const html = postPage(post, cat, '../../', '');
  expect(html).toContain('id="like"');
  expect(html).toContain('data-id="7"');
  expect(html).toContain("K='blog-liked'");
});

test('id와 제목은 이스케이프돼요', () => {
  const html = postPage({ ...post, id: '1"><script>x', title: '<b>' }, cat, '../../', '');
  expect(html).not.toContain('<script>x');
  expect(html).toContain('&lt;b&gt;');
});
