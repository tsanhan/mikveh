import { Routes } from "@angular/router";
import { MainPage } from "./main.page";
import { MainMenuPage } from "../main-menu/main-menu.page";
import { TopicsPage } from "../topics/topics.page";

export const routes: Routes = [

  {
    path: "",
    redirectTo: "/main-menu",
    pathMatch: "full"
  },
  {
    path: "",
    component: MainPage,
    children: [
      {
        path: 'main-menu',
        component: MainMenuPage
        // loadComponent: () => import('../main-menu/main-menu.page').then( m => m.MainMenuPage)
      },
      {
        path: 'topics',
        component: TopicsPage
        // loadComponent: () => import('../main-menu/main-menu.page').then( m => m.MainMenuPage)
      }

    ]
  }

]
