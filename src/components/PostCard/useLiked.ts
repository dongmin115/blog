import { useCallback, useState } from 'react';

const KEY = 'blog-liked';

function read(): Record<string, true> {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; }
}

// 좋아요를 이 기기에만 저장해요. (서버를 붙이면 여기서 API를 부르게 바꿔요)
export function useLiked() {
  const [liked, setLiked] = useState(read);
  const toggle = useCallback((id: string) => {
    setLiked((cur) => {
      const next = { ...cur };
      if (next[id]) delete next[id]; else next[id] = true;
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* 저장 불가 */ }
      return next;
    });
  }, []);
  return { liked, toggle };
}
