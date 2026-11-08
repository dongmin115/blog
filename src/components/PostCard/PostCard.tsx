import { useRef } from 'react';
import type { Cat, Post } from '../../data/types';
import { useLiked } from './useLiked';
import './PostCard.css';

interface Props {
  post: Post | null;
  cats: Cat[];
  onClose(): void;
}

export default function PostCard({ post, cats, onClose }: Props) {
  const { liked, toggle } = useLiked();
  // 닫히는 애니메이션 동안 내용이 사라지지 않게 마지막 글을 붙들고 있어요.
  const last = useRef<Post | null>(null);
  if (post) last.current = post;
  const p = last.current;
  const c = p ? cats[p.cat] : null;
  const on = !!(p && liked[p.id]);
  const n = p ? (p.likes || 0) + (on ? 1 : 0) : 0;

  return (
    <div className={`card${post ? ' open' : ''}`} aria-hidden={!post}>
      {p && c && (
        <div className="sheet">
          <div className="meta">
            <span className="chip" style={{ color: `hsl(${c.h},${c.s}%,72%)` }}>{c.name}</span>
            <span>{p.y !== new Date().getFullYear() ? `${p.y}년 ` : ''}{p.m}월 {p.d}일</span>
            <span>· {p.minutes}분</span>
          </div>
          <h2>{p.title}</h2>
          <div className="body">
            <p>{p.excerpt}</p>
            {p.photo && <img src={p.photo} alt="" />}
          </div>
          <div className="row">
            <div className="stats">{p.views ? `조회 ${p.views}` : ''}</div>
            <div className="acts">
              <button type="button" className={`like${on ? ' on' : ''}`} onClick={() => toggle(p.id)}>
                {on ? '♥' : '♡'} {n || ''}
              </button>
              <a className="btn" href={p.url}>전체 읽기</a>
              <button type="button" className="btn" onClick={onClose}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
