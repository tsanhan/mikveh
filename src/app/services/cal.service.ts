import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, lastValueFrom, map } from 'rxjs';
import { CalEvent, CalEventType } from '../interfaces/cal';
import { LocationService } from './location.service';
import { HDate, HebrewDateEvent, Zmanim } from '@hebcal/core';

@Injectable({
  providedIn: 'root',
})
export class CalService {
  loc = inject(LocationService);
  calEvents$ = new BehaviorSubject<CalEvent[]>(
    [
      {
        hDateSunsetAwareString: '24 Sivan 5785',
        type: CalEventType.SEE_BLOOD,
        afterSunset: false,
      }
    ]
  );
  highlightedDates$ = this.calEvents$.pipe(

    map((entries) => {
      const rtn = entries.map(({ afterSunset, hDateSunsetAwareString, type }) => {       
        const newDate = this.hDateSunsetAwareStringToDate(hDateSunsetAwareString);
        const date = newDate.toISOString().split('T')[0];;
        let textColor;
        let backgroundColor;

        // logic to pick the colors based on the CalEvent array
        if (type === CalEventType.SEE_BLOOD) {
          textColor = '#800080';
          backgroundColor = '#ffc0cb';
        }

        return {
          date,
          textColor,
          backgroundColor,
          afterSunset,
        };
      });
      return rtn;
    })
  );


  constructor() { }


  async addEvent(event: CalEvent) {
    const currentEvents = this.calEvents$.getValue();
    currentEvents.push(event);
    this.calEvents$.next(currentEvents);
  }
  hDateSunsetAwareStringToDate(hDateSunsetAwareString: string): Date {
    const [day, month, year] = hDateSunsetAwareString.split(' ');
    const hDate = new HDate(parseInt(day), month, parseInt(year));
    const gregDate = hDate.greg();
    return new Date(Date.UTC(gregDate.getFullYear(), gregDate.getMonth(), gregDate.getDate()));
  }

  dateToHDate(date: Date, afterSunset: boolean): HDate {    
    if (afterSunset) date.setDate(date.getDate() + 1);
    const hdate = new HDate(date);
    return hdate;
    // zmanAwware.toString();
    // const as = new HebrewDateEvent(zmanAwware);

    // return as.render('he-x-NoNikud');
  }

  hebDateToHebrew(hebrewDate: HDate): string {
    const as = new HebrewDateEvent(hebrewDate);
    return as.render('he-x-NoNikud');
  }

  simpleDateToHebrew(date: Date): HDate {
    const a = new HDate(date);
    return a;
  }


  hebrewDateToDate(hebrewDate: string): Date {
    const loc = this.loc.closestCity;
    
    console.log('lastValueFrom:', loc);

    const hDate = HDate.fromGematriyaString(hebrewDate);
    const zmanAwware = Zmanim.makeSunsetAwareHDate(loc, hDate.greg(), true);
    return zmanAwware.greg();
  }


}
