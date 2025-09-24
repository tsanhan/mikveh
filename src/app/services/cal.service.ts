import { inject, Injectable } from '@angular/core';
import { map, share, shareReplay } from 'rxjs';
import { CalEvent, CalEventType, EventDto, Ona } from '../interfaces/cal';
import { LocationService } from './location.service';
import { CacheService } from './cache.service';
import { Approach, ApproachName } from '../interfaces/approaches';
import { ApproachService } from './approach.service';
import { dateToHDate, getDateParam, hDateStringToHDate, hDateSunsetAwareStringToDate } from '../utils/date.util';

@Injectable({
  providedIn: 'root',
})
export class CalService {
  loc = inject(LocationService);
  cache = inject(CacheService);
  approach = inject(ApproachService);

  calEvents$ = this.cache.calEvents$;

  highlightedDates$ = this.calEvents$.pipe(
    map((calEvents: CalEvent[]) => {
      const events = [...calEvents];
      const rtn:EventDto[] = events.flatMap((calEvent: CalEvent, index: number, entries: CalEvent[]) => this.eventDto(calEvent, entries, index));
      return rtn;
    }),

  );


  constructor() { }


  async addEvent(type: CalEventType, date: Date, afterSunset: boolean) {
    const hdate = dateToHDate(date, afterSunset);
    const events: CalEvent[] = this.cache.getCalEvents();
    const getTheBloodOnes: CalEvent[] = events.filter(x => x.type === CalEventType.SEE_BLOOD);

    // 1. sfarad : if see blood during the first 4 days,
    if (type === CalEventType.SEE_BLOOD) {

      let isTooClose = getTheBloodOnes.some(x => {
        const subject = hDateStringToHDate(x.hDateSunsetAwareString);
        const delta = hdate.deltaDays(subject);

        switch (this.approach.approach$.getValue().name) {
          case ApproachName.SEPHARDI:
            return delta >= 0 && delta <= 3;
          case ApproachName.CHABAD:
          case ApproachName.ASHKENAZI:
            return delta >= 0 && delta <= 4;
          default:
            return false;
        }
      });

      if (isTooClose) {
        return;
      }
    }

    const event: CalEvent = {
      type,
      hDateSunsetAwareString: hdate.toString(),
      afterSunset,
    };
    this.cache.setCalEvent(event);
  }

  private eventDto(event: CalEvent, allevents: CalEvent[], index: number): EventDto[] {
    const { hDateSunsetAwareString, type } = event;
    const date = getDateParam(hDateSunsetAwareString);

    let textColor: string;
    let border: string;
    let backgroundColor: string;
    let details: string[] = [];
    let followingEventsChabadOnaBenonit: EventDto[] = [];

    switch (type) {
      case CalEventType.SEE_BLOOD:
        textColor = '#ff0000'; // Red
        border = '1px solid #ff0000';
        backgroundColor = '#ffe6e6'; // Light red background
        details = [
          'נראה דם',
          'עוד 4 ימים הפסק טהרה',
        ];

        followingEventsChabadOnaBenonit = this.buildFollowingEventsChabadOnaBenonit(event, allevents, index);
        break;
      case CalEventType.OTHER:
        textColor = '#000000'; // Black
        border = '1px solid #000000';
        backgroundColor = '#ffffff'; // White background
        break;
      default:
        textColor = '#000000'; // Fallback text color
        border = '1px solid #000000'; // Fallback border color
        backgroundColor = '#ffffff'; // Fallback background color
        break;
    }

    return [
      {
        type,
        date,
        border,
        textColor,
        backgroundColor,
        details,
        ona: Ona.Clali,
        approach: this.approach.approach$.getValue(),
      },
      ...followingEventsChabadOnaBenonit
    ];
  }



  private buildFollowingEventsChabadOnaBenonit(event: CalEvent, allevents: CalEvent[], index: number): EventDto[] {
    let approach: Approach = this.cache.getApproach(ApproachName.CHABAD);
    let ona: Ona = Ona.OnaBenonit;
    const rtn: EventDto[] = [];
    const date: Date = hDateSunsetAwareStringToDate(event.hDateSunsetAwareString);

    // add 4 days for הפסק טהרה.  if event was on sunday, the next event will be on thursday
    date.setDate(date.getDate() + 4);

    rtn.push({
      type: CalEventType.CAN_START_CHECK_HEFSEK,
      date: date.toISOString().split('T')[0],
      textColor: '#ff8800ff', // Red
      border: '1px solid #ff8800ff',
      backgroundColor: '#ffe6e6', // Light red background
      details: [
        'היום אפשר להתחיל לבדוק הפסק טהרה'
      ],
      ona,
      approach
    });

    // add 1 after הפסק טהרה for ספירת 7 נקיים
    for (let i = 1; i <= 7; i++) {
      date.setDate(date.getDate() + 1);

      const hebDate = dateToHDate(date, false);
      const another = allevents.find((eventObj: CalEvent, eventIndex: number, events: CalEvent[]) =>
        index !== eventIndex &&
        eventObj.hDateSunsetAwareString === hebDate.toString() &&
        eventObj.type === CalEventType.SEE_BLOOD
      );
      let anotherline = '';
      if (another) {
        const indexOfAnother = allevents.indexOf(another);
        allevents.splice(indexOfAnother, 1); // remove the found event to avoid duplicates
        console.log('removing from allevents', another);
        
        i = 1;
        anotherline
          = `היה דם ביום הזה, מתחילים לספור מחדש מ${another.hDateSunsetAwareString}`;

      }


      const toAddtoRtn:EventDto = {
        type: CalEventType.SEVEN_CLEAN,
        date: date.toISOString().split('T')[0],
        textColor: '#a1a05cff',
        backgroundColor: '#fff3e6', // Light orange background
        details: [
          `היום ה${i} של ספירת 7 נקיים`,
        ],
        border: '1px solid #a1a05cff',
        ona,
        approach
      }
      anotherline!! && toAddtoRtn.details.push(anotherline);
      if (i === 7) {
        toAddtoRtn.type = CalEventType.MIKVEH_DAY;
        toAddtoRtn.textColor = '#00ff00'; // Green for the last day
        toAddtoRtn.border = '1px solid #00ff00';
        toAddtoRtn.backgroundColor = '#e6ffe6'; // Light green background
        toAddtoRtn.details.push('היום ה-7 נקיים, היום בערב אפשר לטבול');
      }



      rtn.push(toAddtoRtn);
    }


    const nextMonthsDate = hDateSunsetAwareStringToDate(event.hDateSunsetAwareString);
    nextMonthsDate.setDate(nextMonthsDate.getDate() + 29);
    rtn.push({
      type: CalEventType.BETWEEN_MIKVEH_DAY_AND_PRISHA,
      date: nextMonthsDate.toISOString().split('T')[0],
      textColor: '#ff006aff',
      border: '1px solid #ff006aff',
      backgroundColor: '#ffe6e6', // Light red background
      details: [
        'היום ה-30, יש לבדוק',
      ],
      ona,
      approach
    });

    return rtn;


  }



}
