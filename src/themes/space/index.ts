import { lazy } from 'react';
import { PlanetIcon } from '../../components/icons';
import type { ThemeDef } from '../types';

export const spaceTheme: ThemeDef = {
  id: 'space',
  name: '우주',
  Icon: PlanetIcon,
  Component: lazy(() => import('./SpaceTheme')),
};
