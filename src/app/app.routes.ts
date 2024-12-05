import { Routes } from '@angular/router';
import { ApproachesComponent } from './pages/approaches/approaches.component';
import { CalendarComponent } from './pages/calendar/calendar.component';
import { MapComponent } from './pages/map/map.component';

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
    path: 'map',
    component: MapComponent
  },
  {
    path: '**',
    redirectTo: 'approaches'
  }
];
