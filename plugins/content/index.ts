// content/*.md → posts.json + 글 페이지. dev에서는 미들웨어로, build에서는 산출물로 내보내요.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';
import { loadCategories, loadPosts } from './posts.ts';
import { postPage } from './postPage.ts';

export default function content(): Plugin {
  let root = process.cwd();
  const baseUrl = (process.env.BASE_URL || '').replace(/\/$/, '');
  const contentDir = () => join(root, 'content');
  const css = () => readFileSync(new URL('./post.css', import.meta.url), 'utf8');

  function collect() {
    const posts = loadPosts(join(contentDir(), 'posts'));
    const categories = loadCategories(join(contentDir(), 'categories.json'), posts);
    const slim = posts.map(({ html: _html, ...rest }) => ({ ...rest, url: `posts/${rest.id}/` }));
    const pages = posts.map((p) => ({
      id: p.id,
      html: postPage(p, categories.find((c) => c.name === p.category)!, '../../', baseUrl),
    }));
    return { json: JSON.stringify({ categories, posts: slim, built: new Date().toISOString() }), pages, count: posts.length, cats: categories.length };
  }

  return {
    name: 'blog-content',
    configResolved(cfg) { root = cfg.root; },
    configureServer(server) {
      server.watcher.add(contentDir());
      server.watcher.on('all', (_e, file) => {
        if (file.startsWith(contentDir())) server.ws.send({ type: 'full-reload' });
      });
      server.middlewares.use((req, res, next) => {
        const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
        const send = (type: string, body: string) => { res.setHeader('Content-Type', type); res.setHeader('Cache-Control', 'no-cache'); res.end(body); };
        try {
          if (path === '/posts.json') return send('application/json', collect().json);
          if (path === '/post.css') return send('text/css', css());
          const m = path.match(/^\/posts\/([^/]+)\/?(?:index\.html)?$/);
          if (m) {
            const page = collect().pages.find((p) => p.id === m[1]);
            if (page) return send('text/html; charset=utf-8', page.html);
          }
        } catch (e) {
          res.statusCode = 500; return res.end(String(e));
        }
        next();
      });
    },
    generateBundle() {
      const { json, pages, count, cats } = collect();
      this.emitFile({ type: 'asset', fileName: 'posts.json', source: json });
      this.emitFile({ type: 'asset', fileName: 'post.css', source: css() });
      this.emitFile({ type: 'asset', fileName: '.nojekyll', source: '' });
      for (const p of pages) this.emitFile({ type: 'asset', fileName: `posts/${p.id}/index.html`, source: p.html });
      console.log(`콘텐츠: 글 ${count}편, 카테고리 ${cats}개`);
    },
  };
}
