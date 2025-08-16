import { inject, Injectable } from '@angular/core';
import { LocationService } from './location.service';
import citiesObj from '../../assets/data/cities.json';
import days from '../../assets/data/days.json';

import { map, Observable, shareReplay } from 'rxjs';
import { CalOptions, CandleLightingEvent, HDate, HebrewCalendar, Location, Event, Zmanim, HebrewDateEvent, HavdalahEvent } from '@hebcal/core';
import { getDayString } from '../utils/date.util';

@Injectable({
  providedIn: 'root'
})
export class EventsService {
  location = inject(LocationService);
  cities = Object.keys(citiesObj);


  weekEvents$ = this.location.closestCity$.pipe(
    map((location: Location) => {
      const today = new HDate(new Date());
      const options: CalOptions = {
        year: today.getFullYear(),
        month: today.getMonth(),
        sedrot: true,
        candlelighting: true,
        location,
        il: true,
        locale: 'he',
        end: today.add(1, 'w'),
        start: today,
      };
      const events = HebrewCalendar.calendar(options);

      return events;
    }),
    shareReplay(1)
  );

  fridayCandleLighting$ = this.weekEvents$.pipe(
    map((events: Event[]) => {
      const fridayCL = events.find(
        (event: Event) =>
          event instanceof CandleLightingEvent && event.getDate().getDay() == 5
      );
      return fridayCL as CandleLightingEvent;
    })
  );

  shabatHavdalah$ = this.weekEvents$.pipe(
    map((events: Event[]) => {
      const havdalah = events.find(
        (event: Event) =>
          event instanceof HavdalahEvent && event.getDate().getDay() == 6
      );
      const { eventTime } = havdalah as HavdalahEvent;
      eventTime.setMinutes(eventTime.getMinutes() + 3);
      return eventTime;
    })
  );

  candleLighting$ = this.fridayCandleLighting$.pipe(
    map(({ eventTime }) => eventTime),
    shareReplay(1)
  );



  hDateNow$: Observable<HDate> = this.location.coordinates$.pipe(
    map(({ lat, lng }) => {
      const loc = new Location(lat, lng, true, 'Asia/Jerusalem');
      const zmanAwware = Zmanim.makeSunsetAwareHDate(loc, new Date(), true);
      return zmanAwware;
    })
  );

  today$: Observable<string> = this.hDateNow$.pipe(
    map((zmanim) => getDayString(zmanim)),
  );


  sunriseDate$ = this.location.closestCity$.pipe(
    map((loc: Location) => {
      const sr = new Zmanim(loc, new Date(), true).sunrise();
      sr.setMinutes(sr.getMinutes() + 4);
      return sr;
    })
  );

  sunrise$ = this.sunriseDate$.pipe(
    map((sunriseDate: Date) => {
      const hour = sunriseDate.getHours(); // Get the hour
      const minutes = sunriseDate.getMinutes().toString().padStart(2, '0'); // Ensure minutes are always 2 digits
      const formattedTime = `${hour}:${minutes}`;
      return formattedTime;
    })
  );

  alotHashachar$ = this.sunriseDate$.pipe(
    map((sunriseDate: Date) => {
      sunriseDate.setMinutes(sunriseDate.getMinutes() - 72);
      const hour = sunriseDate.getHours(); // Get the hour
      const minutes = sunriseDate.getMinutes().toString().padStart(2, '0'); // Ensure minutes are always 2 digits
      const formattedTime = `${hour}:${minutes}`;
      return formattedTime;
    })
  );

  sunset$ = this.location.closestCity$.pipe(
    map((loc: Location) => this.locationToSunsetTime(loc, new Date()))
  );
  constructor() {

  }


  locationToSunsetTime(location: Location, date: Date): string {
    const ss = new Zmanim(location, date, true).sunset();
    const hour = ss.getHours(); // Get the hour
    const minutes = ss.getMinutes().toString().padStart(2, '0'); // Ensure minutes are always 2 digits
    const formattedTime = `${hour}:${minutes}`;
    return formattedTime;
  }

  localISOString(date = new Date()) {
    const tzOffset = date.getTimezoneOffset() * 60000; // in milliseconds
    const localDate = new Date(date.getTime() - tzOffset);
    return localDate.toISOString().slice(0, -1);
  }


}
