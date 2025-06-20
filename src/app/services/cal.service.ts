import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, lastValueFrom, map } from 'rxjs';
import { CalEvent, CalEvents, CalEventType } from '../interfaces/cal';
import { LocationService } from './location.service';
import { HDate, HebrewDateEvent, Zmanim } from '@hebcal/core';

@Injectable({
  providedIn: 'root',
})
export class CalService {
  loc = inject(LocationService);
  calEvents$ = new BehaviorSubject<CalEvents>({
    "24 Sivan 5785": [
      {
        type: CalEventType.SEE_BLOOD,
        datetime: '2025-06-20T00:00:00Z',
      }
    ]
  });
  highlightedDates$ = this.calEvents$.pipe(
    map((data: CalEvents) => {
      const entries = Object.entries(data).map(([date, data]) => ({
        date,
        data,
      }));
      return entries;
    }),
    map((entries) => {
      const rtn = entries.map(({ data, date:HebDate }) => {
        const [day, month, year] = HebDate.split(' ');
        const hDate = new HDate(parseInt(day), month, parseInt(year));
        const gregDate = hDate.greg();
        const newDate = new Date(Date.UTC(gregDate.getFullYear(), gregDate.getMonth(), gregDate.getDate()));
        const date = newDate.toISOString().split('T')[0];

        let textColor;
        let backgroundColor;

        // logic to pick the colors based on the CalEvent array
        for (const calEvent of data) {
          if( calEvent.type === CalEventType.SEE_BLOOD) {
            textColor = '#800080';
            backgroundColor = '#ffc0cb';
            break; // Assuming only one type of event per date
          }
        }

        return {
          date,
          textColor,
          backgroundColor,
        };
      });
      return rtn;
    })
  );


  // highlightedDatesFunc = (isoString: string) => {
  //   const date = new Date(isoString);
  //   const utcDay = date.getUTCDate();

  //   if (utcDay % 5 === 0) {
  //     return {
  //       textColor: '#800080',
  //       backgroundColor: '#ffc0cb',
  //     };
  //   }

  //   if (utcDay % 3 === 0) {
  //     return {
  //       textColor: 'var(--ion-color-secondary-contrast)',
  //       backgroundColor: 'var(--ion-color-secondary)',
  //     };
  //   }

  //   return undefined;
  // };

  constructor() {}

  // addHighlightedDate(
  //   dateToSelect: Date,
  //   textColor: string,
  //   backgroundColor: string
  // ) {
  //   const date: string = dateToSelect.toISOString().split('T')[0]; //  YYYY-MM-DD
  //   this.highlightedDatesArr.push({
  //     date,
  //     textColor,
  //     backgroundColor,
  //   });
  // }

  addDate(date: Date, data: any) {
    const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentData = this.calEvents$.value;
    currentData[dateKey] = data;
    this.calEvents$.next(currentData);
  }


  dateToHDate(date: Date): HDate {
      const loc = this.loc.closestCity;
      console.log('lastValueFrom:', loc);

      const zmanAwware = Zmanim.makeSunsetAwareHDate(loc, date, true);
      return zmanAwware;
      // const as = new HebrewDateEvent(zmanAwware);

      // return as.render('he-x-NoNikud');
    }

    hebDateToHebrew(hebrewDate: HDate): string {
      const as = new HebrewDateEvent(hebrewDate);
      return as.render('he-x-NoNikud');
    }

    hebrewDateToDate(hebrewDate: string): Date {
      const loc = this.loc.closestCity;
      console.log('lastValueFrom:', loc);

      const hDate = HDate.fromGematriyaString(hebrewDate);
      const zmanAwware = Zmanim.makeSunsetAwareHDate(loc, hDate.greg(), true);
      return zmanAwware.greg();
    }
}
