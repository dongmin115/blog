import ThemePicker from '../ThemePicker/ThemePicker';
import type { ThemeDef } from '../../themes/types';
import './TopBar.css';

interface Props {
  title: string;
  sub: string;
  onBack?: () => void;
  themes: ThemeDef[];
  themeId: string;
  onTheme(id: string): void;
}

export default function TopBar({ title, sub, onBack, themes, themeId, onTheme }: Props) {
  return (
    <header className="top">
      <div className="brand">
        <b>{title}</b>
        <span>{sub}</span>
      </div>
      <div className="actions">
        {onBack && <button type="button" className="btn" onClick={onBack}>‹ 전체</button>}
        <ThemePicker themes={themes} value={themeId} onChange={onTheme} />
      </div>
    </header>
  );
}
