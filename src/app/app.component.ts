import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet , IonButtons,
  IonContent,
  IonHeader,
  IonMenu,
  IonMenuButton,
  IonTitle,
  IonToolbar,} from '@ionic/angular/standalone';
import { TopButtonsComponent } from "./components/top-buttons/top-buttons.component";


@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [
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
],

})
export class AppComponent {

}
