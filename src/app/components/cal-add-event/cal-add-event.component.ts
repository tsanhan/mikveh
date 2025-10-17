import { addIcons } from 'ionicons';
import { IonButton, IonIcon, IonChip, IonRadioGroup, IonRadio, IonLabel } from '@ionic/angular/standalone';
import { Component, OnInit } from '@angular/core';
import { heart, heartOutline, logoApple, pencilOutline } from 'ionicons/icons';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { featherEdit3 } from '@ng-icons/feather-icons';

@Component({
  selector: 'app-cal-add-event',
  templateUrl: './cal-add-event.component.html',
  styleUrls: ['./cal-add-event.component.scss'],
  imports: [IonLabel, IonRadio, IonRadioGroup, IonChip, 
    IonButton,
    IonIcon,
    NgIcon
  ],
  viewProviders: [provideIcons({ featherEdit3 })]

})
export class CalAddEventComponent  implements OnInit {
  
  constructor() { 
    addIcons({ logoApple, pencilOutline,heart, featherEdit3  });

  }

  ngOnInit() {}

}
