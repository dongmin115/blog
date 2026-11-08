import { useEffect, useRef } from 'react';
import type { ThemeProps } from '../types';
import './SpaceTheme.css';

export default function SpaceTheme({ data, ui, reduce, onUnsupported }: ThemeProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let inst: { destroy(): void } | null = null;
    let dead = false;
    import('./scene')
      .then((m) => m.mountScene({ el, data, ui, reduce }))
      .then((i) => { if (dead) i.destroy(); else inst = i; })
      .catch((e) => { console.error(e); if (!dead) onUnsupported(); });
    return () => { dead = true; inst?.destroy(); };
  }, [data, ui, reduce, onUnsupported]);

  return <div ref={ref} className="space" />;
}
