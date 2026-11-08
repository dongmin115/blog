import { forestTheme } from './forest';
import { listTheme } from './list';
import { spaceTheme } from './space';
import type { ThemeDef } from './types';

// 새 테마는 폴더(src/themes/<id>/)를 만들고 여기에 한 줄만 추가하면 선택창에 나타나요.
export const THEMES: ThemeDef[] = [spaceTheme, forestTheme, listTheme];
export const FALLBACK_THEME = listTheme;
export const DEFAULT_THEME = spaceTheme;
