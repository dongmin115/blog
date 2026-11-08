import { lazy } from 'react';
import { ForestIcon } from '../../components/icons';
import type { ThemeDef } from '../types';

export const forestTheme: ThemeDef = {
  id: 'forest',
  name: '반딧불 숲',
  Icon: ForestIcon,
  Component: lazy(() => import('./ForestTheme')),
};
