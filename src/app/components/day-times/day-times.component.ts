import { AsyncPipe, DatePipe, JsonPipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Locale, Location}  from '@hebcal/core';
Locale.useLocale('he');
import { map } from 'rxjs';
import '@hebcal/cities';

import { LocationService } from 'src/app/services/location.service';
import { IonList, IonItem, IonLabel, IonIcon, IonImg } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  bookOutline,
  calendarOutline,
  locationOutline,
  moonOutline,
  sunnyOutline,
} from 'ionicons/icons';
import { tablerCandle } from '@ng-icons/tabler-icons';
import { bootstrapStars } from '@ng-icons/bootstrap-icons';
import { EventsService } from 'src/app/services/events.service';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { cityToHebrewName } from 'src/app/utils/location.util';
@Component({
  selector: 'app-day-times',
  templateUrl: './day-times.component.html',
  styleUrls: ['./day-times.component.scss'],
  standalone: true,
  imports: [DatePipe, IonImg, IonIcon, AsyncPipe, NgIcon, NgIcon],
  viewProviders: [provideIcons({ tablerCandle, bootstrapStars })]

})
export class DayTimesComponent {
  events = inject(EventsService);
  location = inject(LocationService);

  coordinates = this.location.coordinates$;
  today$ = this.events.today$;
  sunrise$ = this.events.sunrise$;
  alotHashachar$ = this.events.alotHashachar$;
  sunset$ = this.events.sunset$;
  parsha$ = this.events.fridayCandleLighting$.pipe(map(({ memo }) => memo));


  city$ = this.location.closestCity$.pipe(
    map((city: Location) => cityToHebrewName(city)
  ));

  closestCityHebName$ = this.location.closestCityHebName$;
  candleLighting$ = this.events.candleLighting$;
  shabatHavdalah$ = this.events.shabatHavdalah$;

  constructor() {
    addIcons({ calendarOutline, sunnyOutline, moonOutline, bookOutline, locationOutline });
  }
}
