import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Hint from '../components/Hint/Hint';
import Notice from '../components/Notice/Notice';
import PostCard from '../components/PostCard/PostCard';
import TopBar from '../components/TopBar/TopBar';
import { SITE_SUB, SITE_TITLE } from '../config';
import { loadData } from '../data/loadData';
import type { BlogData, Post } from '../data/types';
import { DEFAULT_THEME, FALLBACK_THEME, THEMES } from '../themes/registry';
import type { ThemeUI } from '../themes/types';
import './App.css';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const themeFromHash = () => THEMES.find((t) => t.id === location.hash.replace('#', '')) ?? DEFAULT_THEME;

interface Card { post: Post; onClose?: () => void }
interface Back { fn: () => void }

export default function App() {
  const [data, setData] = useState<BlogData | null>(null);
  const [error, setError] = useState('');
  const [themeId, setThemeId] = useState(() => themeFromHash().id);
  const [fallback, setFallback] = useState(false);
  const [sub, setSub] = useState('');
  const [back, setBack] = useState<Back | null>(null);
  const [hint, setHint] = useState('');
  const [card, setCard] = useState<Card | null>(null);

  // 테마를 바꾸면 이전 테마가 남긴 상단/힌트/카드 상태를 비워요.
  const selectTheme = useCallback((id: string) => {
    setThemeId(id); setFallback(false); setSub(''); setBack(null); setHint(''); setCard(null); setError('');
  }, []);

  useEffect(() => { document.title = SITE_TITLE; }, []);
  useEffect(() => { loadData().then(setData, () => setError('글을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.')); }, []);
  useEffect(() => {
    const onHash = () => selectTheme(themeFromHash().id);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [selectTheme]);

  // 테마에 넘기는 손잡이는 늘 같은 객체여야 테마가 다시 그려지지 않아요.
  const ui = useMemo<ThemeUI>(() => ({
    setSub: (t) => setSub(t || ''),
    setBack: (fn) => setBack(fn ? { fn } : null),
    setHint: (t) => setHint(t || ''),
    showPost: (post, opts) => setCard({ post, onClose: opts?.onClose }),
    hidePost: () => setCard(null),
  }), []);
  const onUnsupported = useCallback(() => {
    setFallback(true);
    setError('이 기기에서는 이 화면을 열 수 없어서 목록으로 보여드려요.');
  }, []);

  const theme = fallback ? FALLBACK_THEME : THEMES.find((t) => t.id === themeId) ?? DEFAULT_THEME;
  const closeCard = () => { const f = card?.onClose; setCard(null); f?.(); };

  return (
    <>
      <div className="stage">
        {data && (
          <Suspense fallback={null}>
            <theme.Component key={theme.id} data={data} ui={ui} reduce={reduce} onUnsupported={onUnsupported} />
          </Suspense>
        )}
      </div>
      <TopBar
        title={SITE_TITLE}
        sub={sub || SITE_SUB}
        onBack={back?.fn}
        themes={THEMES}
        themeId={themeId}
        onTheme={(id) => { if (location.hash !== `#${id}`) location.hash = id; }}
      />
      <Hint text={hint} />
      {data && <PostCard post={card?.post ?? null} cats={data.cats} onClose={closeCard} />}
      <Notice text={error} />
    </>
  );
}
