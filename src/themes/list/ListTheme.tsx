import { useEffect } from 'react';
import type { ThemeProps } from '../types';
import './ListTheme.css';

// 대체 화면: WebGL이 없거나 모션을 줄이고 싶을 때 쓰는 단순 목록.
export default function ListTheme({ data, ui }: ThemeProps) {
  useEffect(() => { ui.setSub('목록'); }, [ui]);

  return (
    <div className="listview">
      <div>
        {data.cats.map((c, i) => {
          const posts = data.inCat(i);
          if (!posts.length) return null;
          return (
            <section key={c.name}>
              <h3 style={{ color: `hsl(${c.h},${c.s}%,72%)` }}>
                {c.name}
                <small>{c.sub} · 글 {posts.length}편</small>
              </h3>
              {posts.map((p) => (
                <a key={p.id} className="item" href={p.url}>
                  <b>{p.title}</b>
                  <span>{p.y !== new Date().getFullYear() ? `${p.y}년 ` : ''}{p.m}월 {p.d}일 · {p.minutes}분</span>
                </a>
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}
