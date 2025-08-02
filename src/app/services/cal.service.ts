import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, lastValueFrom, map } from 'rxjs';
import { CalEvent, CalEventType } from '../interfaces/cal';
import { LocationService } from './location.service';
import { HDate, HebrewDateEvent, Zmanim } from '@hebcal/core';
import { CacheService } from './cache.service';

@Injectable({
  providedIn: 'root',
})
export class CalService {
  loc = inject(LocationService);
  cache = inject(CacheService);
  calEvents$ = this.cache.calEvents$;

  highlightedDates$ = this.calEvents$.pipe(
    map((entries) => {
      const rtn = entries.flatMap((calEvent: CalEvent) => this.eventDto(calEvent));
      return rtn;
    })
  );


  constructor() { }


  async addEvent(event: CalEvent) {
    this.cache.setCalEvent(event);
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


  private eventDto(event: CalEvent): {
    date: string;
    textColor: string;
    backgroundColor: string;
    details: string[];
  }[] {
    const { hDateSunsetAwareString, type } = event;
    const date = this.getDateParam(hDateSunsetAwareString);

    let textColor: string;
    let backgroundColor: string;
    let details: string[] = [];
    let followingEventsChabadOnaBenonit: { date: string; textColor: string; backgroundColor: string, details: string[] }[] = [];

    switch (type) {
      case CalEventType.SEE_BLOOD:
        textColor = '#ff0000'; // Red
        backgroundColor = '#ffe6e6'; // Light red background
        details = [
          'נראה דם',
          'עוד 4 ימים הפסק טהרה',
        ];
        followingEventsChabadOnaBenonit = this.buildFollowingEventsChabadOnaBenonit(event);
        break;
      case CalEventType.OTHER:
        textColor = '#000000'; // Black
        backgroundColor = '#ffffff'; // White background
        break;
      default:
        textColor = '#000000'; // Fallback text color
        backgroundColor = '#ffffff'; // Fallback background color
        break;
    }

    return [
      {
        date,
        textColor,
        backgroundColor,
        details,
      },
      ...followingEventsChabadOnaBenonit
    ];
  }

  private getDateParam(hDateSunsetAwareString: string): string {
    const newDate = this.hDateSunsetAwareStringToDate(hDateSunsetAwareString);
    const date = newDate.toISOString().split('T')[0];
    return date;
  }

  private buildFollowingEventsChabadOnaBenonit(event: CalEvent) {
    const rtn: { date: string; textColor: string; backgroundColor: string, details: string[] }[] = [];
    const date = this.hDateSunsetAwareStringToDate(event.hDateSunsetAwareString);

    // add 4 days for הפסק טהרה. if if event was on sunday, the next event will be on thursday
    date.setDate(date.getDate() + 4);

    rtn.push({
      date: date.toISOString().split('T')[0],
      textColor: '#ff8800ff', // Red
      backgroundColor: '#ffe6e6', // Light red background
      details: [
        'הפסק טהרה',
        'מחר מתחילים לספור 7 נקיים',
      ]
    });

    // add 1 after הפסק טהרה for ספירת 7 נקיים
    for (let i = 1; i <= 7; i++) {
      date.setDate(date.getDate() + 1);
      const toAddtoRtn = {
        date: date.toISOString().split('T')[0],
        textColor: '#a1a05cff',
        backgroundColor: '#fff3e6', // Light orange background
        details: [
          `היום ה${i} של ספירת 7 נקיים`,
        ]
      }
      if (i === 7) {
        toAddtoRtn.textColor = '#00ff00'; // Green for the last day
        toAddtoRtn.backgroundColor = '#e6ffe6'; // Light green background
        toAddtoRtn.details.push('היום ה-7 נקיים, היום בערב אפשר לטבול');
      }
      rtn.push(toAddtoRtn);
    }


    const nextMonthsDate = this.hDateSunsetAwareStringToDate(event.hDateSunsetAwareString);
    nextMonthsDate.setDate(nextMonthsDate.getDate() + 29);
    rtn.push({
      date: nextMonthsDate.toISOString().split('T')[0],
      textColor: '#ff006aff',
      backgroundColor: '#ffe6e6', // Light red background
      details: [
        'היום ה-30, יש לבדוק',
      ]
    });

    return rtn;


  }



}
