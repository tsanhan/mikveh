import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./approachTabs/approachTabs.routes').then((m) => m.routes),
  },
];
