import { Routes } from '@angular/router';
import { ApproachesComponent } from './pages/approaches/approaches.component';
import { CalendarComponent } from './pages/calendar/calendar.component';

export const routes: Routes = [
  {
    path: 'approaches',
    component: ApproachesComponent
  },
  {
    path: 'calendar',
    component: CalendarComponent
  },
  {
    path: '**',
    redirectTo: 'approaches'
  }
];
