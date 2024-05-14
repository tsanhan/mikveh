import { Routes } from '@angular/router';
import { routes as children } from './layout/layout.routes';
export const routes: Routes = [
  {
    path: '',
    children
  }
];
