import { expect, test } from 'vitest';
import { mdToHtml } from './markdown.ts';

test('제목, 강조, 코드', () => {
  expect(mdToHtml('# 제목').trim()).toBe('<h2>제목</h2>');
  expect(mdToHtml('**굵게** *기울임* `코드`')).toMatch(/<strong>굵게<\/strong> <em>기울임<\/em> <code>코드<\/code>/);
});

test('HTML은 이스케이프하고 javascript: 링크는 막아요', () => {
  expect(mdToHtml('<script>alert(1)</script>')).toMatch(/&lt;script&gt;/);
  expect(mdToHtml('[x](javascript:alert(1))')).toMatch(/href="#"/);
});

test('목록과 코드 블록', () => {
  expect(mdToHtml('- a\n- b')).toMatch(/<ul><li>a<\/li><li>b<\/li><\/ul>/);
  expect(mdToHtml('```\n<b>\n```')).toMatch(/<pre><code>&lt;b&gt;/);
});
