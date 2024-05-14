import { Routes } from "@angular/router";
import { MainPage } from "./layout";
import { MainMenuPage } from "../about/about.page";
import { TopicsPage } from "../topics/topics.page";

export const routes: Routes = [

  {
    path: "",
    redirectTo: "/about",
    pathMatch: "full"
  },
  {
    path: "",
    component: MainPage,
    children: [
      {
        path: 'about',
        component: MainMenuPage
        // loadComponent: () => import('../about/about.page').then( m => m.MainMenuPage)
      },
      {
        path: 'topics',
        component: TopicsPage
        // loadComponent: () => import('../about/about.page').then( m => m.MainMenuPage)
      }

    ]
  }

]
