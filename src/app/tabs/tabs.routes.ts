import { Routes } from '@angular/router';
import { ApproachTabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: '',
    component: ApproachTabsPage,
    children: [
      {
        path: 'home-tab',
        loadComponent: () =>
          import('./home-tab/home-tab.page').then((m) => m.HomeTabPage),
      },

      {
        path: 'chabad',
        loadComponent: () =>
          import('./approaches/approaches.page').then(
            (m) => m.ApproachesPage
          ),
        data: { approach: 'chabad' },

      },
      {
        path: 'ashkenaz',
        loadComponent: () =>
          import('./approaches/approaches.page').then(
            (m) => m.ApproachesPage
          ),
          data: { approach: 'ashkenaz' },
      },
      {
        path: 'sfard',
        loadComponent: () =>
          import('./approaches/approaches.page').then(
            (m) => m.ApproachesPage
          ),
        data: { approach: 'sfard' },
      },

      {
        path: '',
        redirectTo: '/tabs/home-tab',
        pathMatch: 'full',
      },

    ],
  },
  {
    path: '',
    redirectTo: '/tabs/home-tab',
    pathMatch: 'full',
  },

];
