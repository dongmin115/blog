import type { ReactNode } from 'react';

// 글자 없이 쓰는 선 아이콘들. 색은 currentColor를 따라가요.
function Svg({ size = 20, children }: { size?: number; children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}
type P = { size?: number };

/** 테마 바꾸기 버튼 */
export const LayersIcon = ({ size }: P) => (
  <Svg size={size}><path d="M12 3 3 8l9 5 9-5-9-5Z" /><path d="m3 12.5 9 5 9-5" /><path d="m3 17 9 5 9-5" opacity=".55" /></Svg>
);
/** 우주 테마: 고리 달린 행성 */
export const PlanetIcon = ({ size }: P) => (
  <Svg size={size}><circle cx="12" cy="12" r="4.6" /><path d="M3.2 15.6c-1.1-1.6 2.5-5.2 8-7.7s10.2-2.7 9.9-.8" transform="translate(0 1.4)" opacity=".8" /></Svg>
);
/** 목록 테마 */
export const ListIcon = ({ size }: P) => (
  <Svg size={size}><path d="M8.5 6.5H20M8.5 12H20M8.5 17.5H20" /><circle cx="4.2" cy="6.5" r=".6" fill="currentColor" /><circle cx="4.2" cy="12" r=".6" fill="currentColor" /><circle cx="4.2" cy="17.5" r=".6" fill="currentColor" /></Svg>
);
/** 반딧불 숲 테마: 나무와 반딧불 */
export const ForestIcon = ({ size }: P) => (
  <Svg size={size}><path d="M12 4.2 6.6 12.3h3L5.8 18.2h12.4l-3.8-5.9h3L12 4.2Z" /><path d="M12 18.2v2.6" /><circle cx="19" cy="6" r=".9" fill="currentColor" /><circle cx="4.6" cy="9" r=".7" fill="currentColor" opacity=".7" /></Svg>
);
