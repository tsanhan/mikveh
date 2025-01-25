import { AsyncPipe, JsonPipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { CalOptions, GeoLocation, HebrewDateEvent, Location, Zmanim } from '@hebcal/core';
import {HDate} from '@hebcal/hdate';

import { map } from 'rxjs';
import { LocationService } from 'src/app/services/location.service';
import { IonList, IonItem, IonLabel, IonIcon } from "@ionic/angular/standalone";
import { addIcons } from 'ionicons';
import { calendarOutline } from 'ionicons/icons';
import { formatJewishDateInHebrew, toJewishDate } from 'jewish-date';
@Component({
  selector: 'app-day-times',
  templateUrl: './day-times.component.html',
  styleUrls: ['./day-times.component.scss'],
  standalone: true,
  imports: [IonIcon, AsyncPipe, JsonPipe],
})
export class DayTimesComponent  {
  constructor() {
    addIcons({ calendarOutline });
  }
  days = ["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"]
  location = inject(LocationService);

  coordinates = this.location.coordinates;
  zmanim = this.coordinates.pipe(
    map(({ lat, lng }) => {
      const loc = new Location(lat, lng, true, 'Asia/Jerusalem');
      const zmanAwware = Zmanim.makeSunsetAwareHDate(loc,new Date(),true);

      return zmanAwware;
    })
  );

  today = this.zmanim.pipe(
    map((zmanim) => {

      const as = new HebrewDateEvent(zmanim);
      const date = as.getDate();
      const day =  date.getDay();
      const dateStr = `${this.days[day]}, ${as.render('he-x-NoNikud')}` ;
      return dateStr
      return formatJewishDateInHebrew(toJewishDate(new Date()));;
    })
  );




}
