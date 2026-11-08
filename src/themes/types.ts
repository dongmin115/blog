import type { ComponentType, LazyExoticComponent, ReactElement } from 'react';
import type { BlogData, Post } from '../data/types';

// 테마가 앱 셸(상단, 힌트, 글 카드)을 조작할 때 쓰는 손잡이.
export interface ThemeUI {
  setSub(text?: string): void;
  setBack(fn?: (() => void) | null): void;
  setHint(text?: string): void;
  /** 화면 가운데에 띄우는 안내 문구(예: 글이 없는 카테고리). 빈 문자열이면 사라져요. */
  setNotice(text?: string): void;
  showPost(post: Post, opts?: { onClose?: () => void }): void;
  hidePost(): void;
}

export interface ThemeProps {
  data: BlogData;
  ui: ThemeUI;
  reduce: boolean;
  /** WebGL 등을 못 써서 이 테마를 보여줄 수 없을 때 부르면 목록 화면으로 대체돼요. */
  onUnsupported(): void;
}

export interface ThemeDef {
  id: string;
  /** 선택 버튼에 그려질 아이콘(글자 없이 아이콘만). */
  Icon: (props: { size?: number }) => ReactElement;
  /** 접근성용 이름(화면에는 안 보여요). */
  name: string;
  Component: LazyExoticComponent<ComponentType<ThemeProps>>;
}
