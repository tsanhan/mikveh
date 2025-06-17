import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CalService {
  dates = new BehaviorSubject<any>({});
  datesArr = this.dates.pipe(
    map((data: any) =>
      Object.entries(data).map(([date, data]) => ({ date, data }))
    ),
    map((arr) =>
      arr.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    )
  );
  highlightedDatesArr = [
    {
      date: '2025-06-05',
      textColor: '#800080',
      backgroundColor: '#ffc0cb',
    },
    {
      date: '2025-06-10',
      textColor: '#09721b',
      backgroundColor: '#c8e5d0',
    },
    {
      date: '2025-06-20',
      textColor: 'var(--ion-color-secondary-contrast)',
      backgroundColor: 'var(--ion-color-secondary)',
    },
    {
      date: '2025-06-23',
      textColor: 'rgb(68, 10, 184)',
      backgroundColor: 'rgb(211, 200, 229)',
    },
  ];

  highlightedDatesFunc = (isoString: string) => {
    const date = new Date(isoString);
    const utcDay = date.getUTCDate();

    if (utcDay % 5 === 0) {
      return {
        textColor: '#800080',
        backgroundColor: '#ffc0cb',
      };
    }

    if (utcDay % 3 === 0) {
      return {
        textColor: 'var(--ion-color-secondary-contrast)',
        backgroundColor: 'var(--ion-color-secondary)',
      };
    }

    return undefined;
  };

  constructor() {}

  addHighlightedDate(
    dateToSelect: Date,
    textColor: string,
    backgroundColor: string
  ) {
    const date: string = dateToSelect.toISOString().split('T')[0]; //  YYYY-MM-DD
    this.highlightedDatesArr.push({
      date,
      textColor,
      backgroundColor,
    });
  }

  addDate(date: Date, data: any) {
    const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentData = this.dates.value;
    currentData[dateKey] = data;
    this.dates.next(currentData);
  }
}
