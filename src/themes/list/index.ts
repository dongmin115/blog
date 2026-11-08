import { lazy } from 'react';
import { ListIcon } from '../../components/icons';
import type { ThemeDef } from '../types';

export const listTheme: ThemeDef = {
  id: 'list',
  name: '목록',
  Icon: ListIcon,
  Component: lazy(() => import('./ListTheme')),
};
