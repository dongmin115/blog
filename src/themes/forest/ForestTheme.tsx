import { useEffect, useRef } from 'react';
import type { ThemeProps } from '../types';
import './ForestTheme.css';

export default function ForestTheme({ data, ui, reduce, onUnsupported }: ThemeProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let inst: { destroy(): void } | null = null;
    let dead = false;
    (async () => {
      // 이정표 붓글씨 폰트가 준비된 뒤에 그려야 첫 화면부터 글씨체가 맞아요(오래 걸리면 기다리지 않아요).
      await Promise.race([
        document.fonts?.load('23px "East Sea Dokdo"').catch(() => undefined),
        new Promise((r) => setTimeout(r, 1200)),
      ]);
      if (dead) return;
      const { mountForest } = await import('./scene');
      const i = await mountForest({ el, data, ui, reduce });
      if (dead) i.destroy(); else inst = i;
    })().catch((e) => { console.error(e); if (!dead) onUnsupported(); });
    return () => { dead = true; inst?.destroy(); };
  }, [data, ui, reduce, onUnsupported]);

  return <div ref={ref} className="forest" />;
}
