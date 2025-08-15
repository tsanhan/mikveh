import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, lastValueFrom, map, share } from 'rxjs';
import { CalEvent, CalEventType, EventDto, Ona } from '../interfaces/cal';
import { LocationService } from './location.service';
import { HDate, HebrewDateEvent, Zmanim } from '@hebcal/core';
import { CacheService } from './cache.service';
import { Approach, ApproachName } from '../interfaces/approaches';
import { ApproachService } from './approach.service';
import {Dayjs} from 'dayjs';

@Injectable({
  providedIn: 'root',
})
export class CalService {
  loc = inject(LocationService);
  cache = inject(CacheService);
  approach = inject(ApproachService);

  calEvents$ = this.cache.calEvents$;

  highlightedDates$ = this.calEvents$.pipe(
    map((entries) => {
      const rtn = entries.flatMap((calEvent: CalEvent) => this.eventDto(calEvent));
      return rtn;
    }),
    share()
  );


  constructor() { }


  async addEvent(type: CalEventType, date: Date, afterSunset: boolean) {
    const hdate = this.dateToHDate(date, afterSunset);
    const events: CalEvent[] = this.cache.getCalEvents();
    const getTheBloodOnes: CalEvent[]= events.filter(x => x.type === CalEventType.SEE_BLOOD);

    // 1. sfarad : if see blood during the first 4 days,
    if (type === CalEventType.SEE_BLOOD) {
      let isTooClose = false;
      switch(this.approach.approach$.getValue().name) {
        case ApproachName.SEPHARDI:
          isTooClose = getTheBloodOnes.some(x => {
            const subject = this.hDateStringToHDate(x.hDateSunsetAwareString);
            const isTooClose = hdate.deltaDays(subject) <= 3;
            return isTooClose;
          });
          break;
        case ApproachName.CHABAD:
        case ApproachName.ASHKENAZI:
          isTooClose = getTheBloodOnes.some(x => {
            const subject = this.hDateStringToHDate(x.hDateSunsetAwareString);
            const isTooClose = hdate.deltaDays(subject) <= 4;
            return isTooClose;
          });
          break;
          
      }
      if (isTooClose) {
        return; // do not add the event, it's too close to a previous blood event
      }

      // get the later most date behind this date
      
      
      const filteredBrforeNow = getTheBloodOnes.filter(x => this.hDateSunsetAwareStringToDate(x.hDateSunsetAwareString) < date);
      const later = filteredBrforeNow.sort((a: CalEvent, b: CalEvent) => this.hDateSunsetAwareStringToDate(a.hDateSunsetAwareString).getTime() - this.hDateSunsetAwareStringToDate(b.hDateSunsetAwareString).getTime()).pop() as CalEvent
      
      const laterDate = this.hDateSunsetAwareStringToDate(later.hDateSunsetAwareString);
      
      const a = new Dayjs(laterDate);
      
      
      const isDurring4FirstDays = Math.abs(date.getTime() - laterDate.getTime())
      const millisecondsInDay = 1000 * 60 * 60 * 24;
      const daysDifference = Math.floor(isDurring4FirstDays / millisecondsInDay);
      if (daysDifference < 4) {
        return ;
      }
      // if during the first 4 days, dismiss the event

    }
    // check if the event is blood
    // then if it's in 7 nekeem we delete the previuse blood report and apply this one as if it was 4 days ego (restarting 7 nekeem)

    const event: CalEvent = {
      type,
      hDateSunsetAwareString: hdate.toString(),
      afterSunset,
    };
    this.cache.setCalEvent(event);
  }


  hDateStringToHDate(hDateSunsetAwareString: string): HDate {
    const [day, month, year] = hDateSunsetAwareString.split(' ');
    return new HDate(parseInt(day), month, parseInt(year));
  }

  hDateSunsetAwareStringToDate(hDateSunsetAwareString: string): Date {
    const hDate = this.hDateStringToHDate(hDateSunsetAwareString);
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

  /**
   approach
  : 
  {nameHeb: 'חב"ד', name: 'chabad', svg: 'jamCrown'}
  backgroundColor
  : 
  "#e6ffe6"
  date
  : 
  "2025-08-15"
  details
  : 
  (2) ['היום ה7 של ספירת 7 נקיים', 'היום ה-7 נקיים, היום בערב אפשר לטבול']
  ona
  : 
  "עונה בינונית"
  textColor
  : 
  "#00ff00"
   */
  private eventDto(event: CalEvent): EventDto[] {
    const { hDateSunsetAwareString, type } = event;
    const date = this.getDateParam(hDateSunsetAwareString);

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

  private getDateParam(hDateSunsetAwareString: string): string {
    const newDate = this.hDateSunsetAwareStringToDate(hDateSunsetAwareString);
    const date = newDate.toISOString().split('T')[0];
    return date;
  }

  private buildFollowingEventsChabadOnaBenonit(event: CalEvent): EventDto[] {
    let approach: Approach = this.cache.getApproach(ApproachName.CHABAD);
    let ona: Ona = Ona.OnaBenonit;
    const rtn: EventDto[] = [];
    const date: Date = this.hDateSunsetAwareStringToDate(event.hDateSunsetAwareString);

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


    const nextMonthsDate = this.hDateSunsetAwareStringToDate(event.hDateSunsetAwareString);
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
