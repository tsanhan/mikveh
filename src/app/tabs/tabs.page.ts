import { Component, EnvironmentInjector, inject } from '@angular/core';
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { triangle, ellipse, square, homeOutline } from 'ionicons/icons';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { jamCrown } from '@ng-icons/jam-icons';
import { faSolidScrollTorah, faSolidBookTanakh } from '@ng-icons/font-awesome/solid'
@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: true,
  imports: [
    IonTabs,
    IonTabBar,
    IonTabButton,
    IonIcon,
    IonLabel,
    NgIconComponent,
  ],
  providers:[provideIcons({jamCrown, faSolidScrollTorah, faSolidBookTanakh})]
})
export class ApproachTabsPage {
  public jamCrown = jamCrown;
  public faSolidScrollTorah = faSolidScrollTorah;
  public faSolidBookTanakh = faSolidBookTanakh;
  public environmentInjector = inject(EnvironmentInjector);

  constructor() {
    addIcons({ triangle, ellipse, square, homeOutline });
  }
}
