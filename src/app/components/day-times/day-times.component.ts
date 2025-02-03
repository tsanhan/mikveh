import { AsyncPipe, JsonPipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import days from '../../../assets/data/days.json';
import parashot from '../../../assets/data/parashot.json';

import { map } from 'rxjs';
import { LocationService } from 'src/app/services/location.service';
import { IonList, IonItem, IonLabel, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  bookOutline,
  calendarOutline,
  moonOutline,
  sunnyOutline,
} from 'ionicons/icons';
import { EventsService } from 'src/app/services/events.service';
@Component({
  selector: 'app-day-times',
  templateUrl: './day-times.component.html',
  styleUrls: ['./day-times.component.scss'],
  standalone: true,
  imports: [IonIcon, AsyncPipe, JsonPipe],
})
export class DayTimesComponent {
  events = inject(EventsService);
  location = inject(LocationService);

  coordinates = this.location.coordinates$;
  today$ = this.events.today$;
  sunrise$ = this.events.sunrise$;
  sunset$ = this.events.sunset$;
  parsha$ = this.events.fridayCandleLighting$.pipe(map(({ memo }) => memo));

  // this.zmanim$.pipe(
  //   map((zmanim) => {
  //     const as = new HebrewDateEvent(zmanim);
  //     const sedra = new Sedra(as.getDate().getFullYear(), true);
  //     const sedraResult = sedra.lookup(zmanim);
  //     const first = sedraResult.parsha[0];
  //     if (sedraResult.parsha.length === 1) {
  //       return `פרשת השבוע: פרשת ${this.para[first]}`;
  //     }
  //     const second = sedraResult.parsha[1];
  //     return `פרשת השבוע: פרשת ${this.para[first]}-${this.para[second]}`
  //   })
  // );

  constructor() {
    addIcons({ calendarOutline, sunnyOutline, moonOutline, bookOutline });
  }
}
