import { Routes } from '@angular/router';
import { routes as children } from './main/main.routes';
export const routes: Routes = [
  {
    path: '',
    children
  }
];
