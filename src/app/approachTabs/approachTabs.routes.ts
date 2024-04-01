import { Routes } from '@angular/router';
import { ApproachTabsPage } from './approachTabs.page';

export const routes: Routes = [
  {
    path: 'approachTabs',
    component: ApproachTabsPage,
    children: [
      {
        path: 'approach1tab',
        loadComponent: () =>
          import('../approach1tab/approach1tab.page').then((m) => m.Approach1Tab),
      },
      {
        path: 'approach2tab',
        loadComponent: () =>
          import('../approach2tab/approach2tab.page').then((m) => m.approach2tabPage),
      },
      {
        path: 'approach3tab',
        loadComponent: () =>
          import('../approach3tab/approach3tab.page').then((m) => m.approach3tabPage),
      },
      {
        path: '',
        redirectTo: '/approachTabs/approach1tab',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '',
    redirectTo: '/approachTabs/approach1tab',
    pathMatch: 'full',
  },
];
