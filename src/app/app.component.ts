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
import { closeOutline } from 'ionicons/icons';


@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [IonIcon, IonButton,
    IonApp,
    IonRouterOutlet,
    TopButtonsComponent,
    IonButtons,
    IonContent,
    IonHeader,
    IonMenu,
    IonMenuButton,
    IonTitle,
    IonToolbar,
    IonMenuToggle,

],

})
export class AppComponent {
  /**
   *
   */
  constructor() {
    addIcons({ closeOutline });

  }
}
