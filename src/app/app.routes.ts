import { Routes } from '@angular/router';
import { ApproachesComponent } from './pages/approaches/approaches.component';

export const routes: Routes = [
  {
    path: 'approaches',
    component: ApproachesComponent
  },
  {
    path: '**',
    redirectTo: 'approaches'
  }
];
