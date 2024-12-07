import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { IonContent, IonButton } from '@ionic/angular/standalone';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonButton, IonContent]
})
export class MapComponent {

  constructor() { }

  getCurrentLocation(){

  }

}
