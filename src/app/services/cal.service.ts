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
    map((entries: CalEvent[]) => {
      const rtn = entries.flatMap((calEvent: CalEvent) => this.eventDto(calEvent));
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

  private eventDto(event: CalEvent): EventDto[] {
    const { hDateSunsetAwareString, type } = event;
    const date = getDateParam(hDateSunsetAwareString);

    let textColor: string;
    let backgroundColor: string;
    let details: string[] = [];
    let followingEventsChabadOnaBenonit: EventDto[] = [];

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
        type,
        date,
        textColor,
        backgroundColor,
        details,
        ona: Ona.Clali,
        approach: this.approach.approach$.getValue(),
      },
      ...followingEventsChabadOnaBenonit
    ];
  }



  private buildFollowingEventsChabadOnaBenonit(event: CalEvent): EventDto[] {
    let approach: Approach = this.cache.getApproach(ApproachName.CHABAD);
    let ona: Ona = Ona.OnaBenonit;
    const rtn: EventDto[] = [];
    const date: Date = hDateSunsetAwareStringToDate(event.hDateSunsetAwareString);

    // add 4 days for הפסק טהרה. if if event was on sunday, the next event will be on thursday
    date.setDate(date.getDate() + 4);

    rtn.push({
      type: CalEventType.BETWEEN_BLOOD_AND_HEFSEK,
      date: date.toISOString().split('T')[0],
      textColor: '#ff8800ff', // Red
      backgroundColor: '#ffe6e6', // Light red background
      details: [
        'הפסק טהרה',
        'מחר מתחילים לספור 7 נקיים',
      ],
      ona,
      approach
    });

    // add 1 after הפסק טהרה for ספירת 7 נקיים
    for (let i = 1; i <= 7; i++) {
      date.setDate(date.getDate() + 1);
      const toAddtoRtn = {
        type: CalEventType.SEVEN_CLEAN,
        date: date.toISOString().split('T')[0],
        textColor: '#a1a05cff',
        backgroundColor: '#fff3e6', // Light orange background
        details: [
          `היום ה${i} של ספירת 7 נקיים`,
        ],
        ona,
        approach
      }
      if (i === 7) {
        toAddtoRtn.type = CalEventType.MIKVEH_DAY;
        toAddtoRtn.textColor = '#00ff00'; // Green for the last day
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
