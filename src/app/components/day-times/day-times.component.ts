import { AsyncPipe, JsonPipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import * as days from '../../../assets/data/days.json';
import * as parashot from '../../../assets/data/parashot.json';

import {
  CalOptions,
  GeoLocation,
  HebrewDateEvent,
  Location,
  parshiot,
  Sedra,
  Zmanim,
} from '@hebcal/core';

import { map } from 'rxjs';
import { LocationService } from 'src/app/services/location.service';
import { IonList, IonItem, IonLabel, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { bookOutline, calendarOutline, moonOutline, sunnyOutline } from 'ionicons/icons';
@Component({
  selector: 'app-day-times',
  templateUrl: './day-times.component.html',
  styleUrls: ['./day-times.component.scss'],
  standalone: true,
  imports: [IonIcon, AsyncPipe, JsonPipe],
})
export class DayTimesComponent {
  constructor() {
    addIcons({ calendarOutline, sunnyOutline, moonOutline, bookOutline });
  }
  para:any = {...parashot}

  location = inject(LocationService);

  coordinates = this.location.coordinates$;
  zmanim = this.coordinates.pipe(
    map(({ lat, lng }) => {
      const loc = new Location(lat, lng, true, 'Asia/Jerusalem');
      const zmanAwware = Zmanim.makeSunsetAwareHDate(loc, new Date(), true);

      return zmanAwware;
    })
  );

  today = this.zmanim.pipe(
    map((zmanim) => {
      const as = new HebrewDateEvent(zmanim);
      const day = as.getDate().getDay();
      const dateStr = `יום ${days[day]}, ${as.render('he-x-NoNikud')}`;
      return dateStr;
    })
  );

  sunrise = this.coordinates.pipe(
    map(({ lat, lng }) => {
      const loc = new Location(lat, lng, true, 'Asia/Jerusalem');

      const sr = new Zmanim(loc, new Date(), true).sunrise();
      const hour = sr.getHours(); // Get the hour
      const minutes = sr.getMinutes().toString().padStart(2, '0'); // Ensure minutes are always 2 digits
      const formattedTime = `עלות השחר: ${hour}:${minutes}`;
      return formattedTime;
    })
  );

  sunset = this.coordinates.pipe(
    map(({ lat, lng }) => {
      const loc = new Location(lat, lng, true, 'Asia/Jerusalem');
      const ss = new Zmanim(loc, new Date(), true).sunset();
      const hour = ss.getHours(); // Get the hour
      const minutes = ss.getMinutes().toString().padStart(2, '0'); // Ensure minutes are always 2 digits
      const formattedTime = `שקיעה: ${hour}:${minutes}`;
      return formattedTime;
    })
  );

  parsha = this.zmanim.pipe(
    map((zmanim) => {
      const as = new HebrewDateEvent(zmanim);
      const sedra = new Sedra(as.getDate().getFullYear(), true);
      const sedraResult = sedra.lookup(zmanim);
      const first = sedraResult.parsha[0];
      if (sedraResult.parsha.length === 1) {
        return `פרשת השבוע: פרשת ${this.para[first]}`;
      }
      const second = sedraResult.parsha[1];
      return `פרשת השבוע: פרשת ${this.para[first]}-${this.para[second]}`
    })
  );


}
