import { useEffect, useId, useRef, useState } from 'react';
import { LayersIcon } from '../icons';
import type { ThemeDef } from '../../themes/types';
import './ThemePicker.css';

interface Props {
  themes: ThemeDef[];
  value: string;
  onChange(id: string): void;
}

// 작은 아이콘 버튼 하나. 누르면 테마 아이콘들이 펼쳐지고, 하나를 고르면 닫혀요.
export default function ThemePicker({ themes, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onDown = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onDown); };
  }, [open]);

  return (
    <div className="theme-picker" ref={wrap} data-open={open}>
      <button
        type="button"
        className="tp-trigger"
        aria-label="테마 선택"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <LayersIcon size={18} />
      </button>
      <div id={menuId} className="tp-menu" role="radiogroup" aria-label="테마" hidden={!open}>
        {themes.map((t) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={t.id === value}
            aria-label={t.name}
            title={t.name}
            className="tp-item"
            onClick={() => { setOpen(false); if (t.id !== value) onChange(t.id); }}
          >
            <t.Icon size={20} />
          </button>
        ))}
      </div>
    </div>
  );
}
