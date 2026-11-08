// 의존성 없는 간단 테스트: node scripts/test.mjs
import assert from 'node:assert/strict';
import { parseFrontmatter, mdToHtml, loadPosts } from './build.mjs';

const { meta, body } = parseFrontmatter('---\ntitle: "안녕: 세상"\ndate: 2026-01-02\ndraft: true\n---\n본문');
assert.equal(meta.title, '안녕: 세상');
assert.equal(meta.draft, true);
assert.equal(body, '본문');

assert.equal(mdToHtml('# 제목').trim(), '<h2>제목</h2>');
assert.match(mdToHtml('**굵게** *기울임* `코드`'), /<strong>굵게<\/strong> <em>기울임<\/em> <code>코드<\/code>/);
assert.match(mdToHtml('<script>alert(1)</script>'), /&lt;script&gt;/, 'HTML은 이스케이프돼야 해요');
assert.match(mdToHtml('[x](javascript:alert(1))'), /href="#"/, 'javascript: 링크는 막아야 해요');
assert.match(mdToHtml('- a\n- b'), /<ul><li>a<\/li><li>b<\/li><\/ul>/);
assert.match(mdToHtml('```\n<b>\n```'), /<pre><code>&lt;b&gt;/);

const posts = loadPosts();
assert.ok(posts.length >= 1, '샘플 글이 있어야 해요');
assert.ok(posts.every((p) => p.id && /^\d{4}-\d{2}-\d{2}$/.test(p.date)));
assert.equal(new Set(posts.map((p) => p.id)).size, posts.length, 'id는 겹치면 안 돼요');
console.log('테스트 통과');
