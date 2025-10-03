import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet , IonButtons,
  IonContent,
  IonHeader,
  IonMenu,
  IonMenuButton,
  IonTitle,
  IonToolbar, IonButton ,
  IonMenuToggle, IonIcon } from '@ionic/angular/standalone';
import { TopButtonsComponent } from "./components/top-buttons/top-buttons.component";
import { addIcons } from 'ionicons';
import { arrowForwardOutline, closeOutline } from 'ionicons/icons';
import { SideMenuContentComponent } from "./components/side-menu-content/side-menu-content.component";


@Component({
    selector: 'app-root',
    templateUrl: 'app.component.html',
    styleUrls: ['app.component.scss'],
    imports: [IonIcon, IonButton,
        IonApp,
        IonRouterOutlet,
        TopButtonsComponent,
        // IonButtons,
        IonContent,
        IonHeader,
        IonMenu,
        // IonMenuButton,
        // IonTitle,
        IonToolbar,
        IonMenuToggle, SideMenuContentComponent]
})
export class AppComponent {
  /**
   *
   */
  constructor() {
    addIcons({ closeOutline, arrowForwardOutline });

  }
}
