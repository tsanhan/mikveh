import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CalService {

  dates$ = new BehaviorSubject<any>({
    '2025-06-05': {
      hebCalEvent: '7 cleanings, blood observed',
      instructions: 'Check your teeth',
      hashashType: 'hashashType1',
    },
    '2025-06-10': {
      hebCalEvent: 'Blood observed',
      instructions: 'Check your blood',
      hashashType: 'hashashType2',
    },
    '2025-06-20': {
      hebCalEvent: 'Blood observed',
      instructions: 'Check your blood',
      hashashType: 'hashashType3',
    },
    '2025-06-23': {
      hebCalEvent: 'Blood observed',
      instructions: 'Check your blood',
      hashashType: 'hashashType4',
    },
  });
  highlightedDates$ = this.dates$.pipe(
    map((data: any) => {
      const entries = Object.entries(data).map(([date, data]) => ({
        date,
        data,
      }));
      return entries;
    }),
    map((entries) => {
      const rtn = entries.map(({ data, date }) => {
        return {
          date,
          textColor: '#800080',
          backgroundColor: '#ffc0cb',
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
    const currentData = this.dates$.value;
    currentData[dateKey] = data;
    this.dates$.next(currentData);
  }
}
