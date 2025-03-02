import { inject, Injectable } from '@angular/core';
import { LocationService } from './location.service';
import citiesObj from '../../assets/data/cities.json';
import days from '../../assets/data/days.json';

import { map, Observable, shareReplay } from 'rxjs';
import { CalOptions, CandleLightingEvent, HDate, HebrewCalendar, Location, Event, Zmanim, HebrewDateEvent, HavdalahEvent } from '@hebcal/core';

@Injectable({
  providedIn: 'root'
})
export class EventsService {
  location = inject(LocationService);
  cities = Object.keys(citiesObj);


  weekEvents$ = this.location.closestCity$.pipe(
    map((closest: Location) => {
      const today = new HDate(new Date());
      const options: CalOptions = {
        year: today.getFullYear(),
        month: today.getMonth(),
        sedrot: true,
        candlelighting: true,
        location: closest,
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
      const  {eventTime} = havdalah as HavdalahEvent;
      return eventTime
    })
  );

  candleLighting$ = this.fridayCandleLighting$.pipe(
    map(({ eventTime }) => eventTime),
    shareReplay(1)
  );
  zmanim$ = this.location.coordinates$.pipe(
      map(({ lat, lng }) => {
        const loc = new Location(lat, lng, true, 'Asia/Jerusalem');
        const zmanAwware = Zmanim.makeSunsetAwareHDate(loc, new Date(), true);

        return zmanAwware;
      })
    );

  today$ = this.zmanim$.pipe(
      map((zmanim) => {
        const as = new HebrewDateEvent(zmanim);
        const day = as.getDate().getDay();
        const dateStr = `יום ${days[day]}, ${as.render('he-x-NoNikud')}`;
        return dateStr;
      })
    );

    sunrise$ = this.location.closestCity$.pipe(
      map((loc: Location) => {
        const sr = new Zmanim(loc, new Date(), true).sunrise();
        const hour = sr.getHours(); // Get the hour
        const minutes = sr.getMinutes().toString().padStart(2, '0'); // Ensure minutes are always 2 digits
        const formattedTime = `${hour}:${minutes}`;
        return formattedTime;
      })
    );

    sunset$ = this.location.closestCity$.pipe(
      map((loc: Location) => {
        const ss = new Zmanim(loc, new Date(), true).sunset();
        const hour = ss.getHours(); // Get the hour
        const minutes = ss.getMinutes().toString().padStart(2, '0'); // Ensure minutes are always 2 digits
        const formattedTime = `${hour}:${minutes}`;
        return formattedTime;
      })
    );
  constructor() {

  }
}
