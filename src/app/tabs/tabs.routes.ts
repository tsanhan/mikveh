import { Routes } from '@angular/router';
import { ApproachTabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: 'tabs',
    component: ApproachTabsPage,
    children: [
      {
        path: 'home-tab',
        loadComponent: () =>
          import('./home-tab/home-tab.page').then((m) => m.HomeTabPage),
      },

      {
        path: 'tab1-chabad',
        loadComponent: () =>
          import('./tab1-chabad/tab1-chabad.page').then(
            (m) => m.Tab1ChabadPage
          ),
      },
      {
        path: 'tab2-ashkenaz',
        loadComponent: () =>
          import('./tab2-ashkenaz/tab2-ashkenaz.page').then(
            (m) => m.Tab2AshkenazPage
          ),
      },
      {
        path: 'tab3-sfard',
        loadComponent: () =>
          import('./tab3-sfard/tab3-sfard.page').then((m) => m.Tab3SfardPage),
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
