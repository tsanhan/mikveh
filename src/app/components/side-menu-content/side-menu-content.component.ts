import { ChangeDetectionStrategy, Component, OnInit, signal, WritableSignal } from '@angular/core';
import { IonIcon, IonSegment, IonSegmentButton, IonButton, IonFab, IonFabButton, IonImg, IonText } from "@ionic/angular/standalone";
import { NgIcon, provideIcons } from '@ng-icons/core';
import { bootstrapClock } from '@ng-icons/bootstrap-icons';
import { timeOutline, searchOutline, logoWhatsapp } from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { CommonModule } from '@angular/common';
import { DayTimesComponent } from '../day-times/day-times.component';
@Component({
  selector: 'app-side-menu-content',
  templateUrl: './side-menu-content.component.html',
  styleUrls: ['./side-menu-content.component.scss'],
  standalone: true,
  imports: [CommonModule, IonText, IonImg, IonFabButton, IonFab, IonButton, IonSegmentButton, IonSegment, IonIcon,NgIcon,DayTimesComponent ],
  viewProviders: [provideIcons({ bootstrapClock })],
  changeDetection: ChangeDetectionStrategy.OnPush

})
export class SideMenuContentComponent  implements OnInit {
  page:WritableSignal<"time"|"search"> = signal("time");


  countryCode: string = '972';
  wsNumber: string = '584298770';
  url: string =
    'https://wa.me/' +
    this.countryCode +
    this.wsNumber +
    '?text=%D7%A9%D7%9C%D7%95%D7%9D.%20%D7%90%D7%A0%D7%99%20%D7%A8%D7%95%D7%A6%D7%94%20%D7%9C%D7%A9%D7%90%D7%95%D7%9C%20%D7%A9%D7%90%D7%9C%D7%94%20%D7%91%D7%A0%D7%95%D7%92%D7%A2%20%D7%9C%D7%94%D7%9C%D7%9B%D7%95%D7%AA%20%D7%A0%D7%99%D7%93%D7%94.';

  constructor() {
    addIcons({timeOutline,searchOutline,logoWhatsapp});

  }

  ngOnInit() {
    console.log('SideMenuContentComponent');

  }

}
