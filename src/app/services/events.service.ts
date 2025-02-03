import { inject, Injectable } from '@angular/core';
import { LocationService } from './location.service';
import cities from '../../assets/data/cities.json';
import { map, Observable, shareReplay } from 'rxjs';
import { CalOptions, CandleLightingEvent, HDate, HebrewCalendar, Location } from '@hebcal/core';

@Injectable({
  providedIn: 'root'
})
export class EventsService {
  location = inject(LocationService);
  cities = [...cities];


  weekEvents = this.location.coordinates$.pipe(
    map(({ lat, lng }) => {
      // gte the city that is closest to the coordinates
      let closest = Location.lookup(this.cities[0]) as Location;
      for (const city of this.cities.slice(1)) {
        const location = Location.lookup(city) as Location;
        const disClosest = this.location.calcDistance(
          lat,
          lng,
          closest.getLatitude(),
          closest.getLongitude()
        );
        const disCurrent = this.location.calcDistance(
          lat,
          lng,
          location.getLatitude(),
          location.getLongitude()
        );
        if (disCurrent < disClosest) {
          closest = location;
        }
      }
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

  fridayCandleLighting$ = this.weekEvents.pipe(
    map((events: Event[]) => {
      const fridayCL = events.find(
        (event: Event) =>
          event instanceof CandleLightingEvent && event.getDate().getDay() == 5
      );
      return fridayCL;
    })
  );
  constructor() {
    this.fridayCandleLighting.subscribe((event) => {
      console.log('Friday Candle Lighting', event);
    });
  }
}
