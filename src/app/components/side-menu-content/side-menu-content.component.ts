import { Component, OnInit } from '@angular/core';
import { IonIcon, IonSegment, IonSegmentButton, IonButton } from "@ionic/angular/standalone";
import { NgIcon, provideIcons } from '@ng-icons/core';
import { bootstrapClock } from '@ng-icons/bootstrap-icons';
import { heart, timeOutline, searchOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';
@Component({
  selector: 'app-side-menu-content',
  templateUrl: './side-menu-content.component.html',
  styleUrls: ['./side-menu-content.component.scss'],
  standalone: true,
  imports: [IonButton, IonSegmentButton, IonSegment, IonIcon,NgIcon ],
  viewProviders: [provideIcons({ bootstrapClock })]


})
export class SideMenuContentComponent  implements OnInit {

  constructor() {
    addIcons({timeOutline,searchOutline,heart});

  }

  ngOnInit() {
    console.log('SideMenuContentComponent');

  }

}
