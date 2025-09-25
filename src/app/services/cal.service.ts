import { inject, Injectable } from '@angular/core';
import { combineLatest, map, share, shareReplay } from 'rxjs';
import { CachedCalEvent, DayType, EventDto, InputEventType, Ona } from '../interfaces/cal';
import { LocationService } from './location.service';
import { CacheService } from './cache.service';
import { Approach, ApproachName } from '../interfaces/approaches';
import { ApproachService } from './approach.service';
import { dateToHDate, getDateParam, hDateStringToHDate, hDateSunsetAwareStringToDate } from '../utils/date.util';
import { HDate } from '@hebcal/core';

@Injectable({
  providedIn: 'root',
})
export class CalService {
  loc = inject(LocationService);
  cache = inject(CacheService);
  approach = inject(ApproachService);

  calEvents$ = this.cache.calEvents$;

  highlightedDates$ = combineLatest([this.calEvents$, this.approach.approach$]).pipe(
    map(([calEvents, approach]: [CachedCalEvent[], Approach]) => {
      const events = [...calEvents];
      const rtn: EventDto[] = events.flatMap((calEvent: CachedCalEvent, index: number, entries: CachedCalEvent[]) => this.eventDto(calEvent, entries, index, approach));
      return rtn;
    })
  );


  constructor() { }


  async addEvent(date: Date, type: InputEventType, afterSunset: boolean) {
    afterSunset = type === InputEventType.HEFSEK_TAHARA ? false : afterSunset; // hefsek is always during the day
    const hdate = dateToHDate(date, afterSunset);


    const event: CachedCalEvent = {
      type,
      hDateSunsetAwareString: hdate.toString(),
      afterSunset,
      gregorianDateString: date.toISOString().split('T')[0],
    };
    this.cache.setCalEvent(event);
  }

  private eventDto(event: CachedCalEvent, allevents: CachedCalEvent[], index: number, approach: Approach): EventDto[] {
    const { hDateSunsetAwareString, type, afterSunset, gregorianDateString } = event;

    let textColor: string;
    let border: string;
    let backgroundColor: string;
    let details: string[] = [];
    let followingEventsChabadOnaBenonit: EventDto[] = [];



    switch (type) {
      case InputEventType.SEE_BLOOD:
        switch (approach.name) {
          case ApproachName.ASHKENAZI:
          case ApproachName.CHABAD:
            followingEventsChabadOnaBenonit = this.buildEventsToHefsek(event, allevents, index);
            break;
          case ApproachName.SEPHARDI:
            followingEventsChabadOnaBenonit = this.buildEventsToHefsek(event, allevents, index, 4);
            break;

        }
        followingEventsChabadOnaBenonit.push(this.buildPrishaEventOnaBenonit(event, approach));
        followingEventsChabadOnaBenonit.push(this.buildPrishaEventVesetHaHodesh(event, approach));
        break;
      case InputEventType.HEFSEK_TAHARA:
        switch (approach.name) {
          case ApproachName.CHABAD:
          case ApproachName.ASHKENAZI:
          case ApproachName.SEPHARDI:
            followingEventsChabadOnaBenonit = this.buildEvents7CleanToPrisha(event, allevents, index);
            break;
        }

    }

    return [
      ...followingEventsChabadOnaBenonit
    ];
  }

  private buildEvents7CleanToPrisha(event: CachedCalEvent, allevents: CachedCalEvent[], index: number): EventDto[] {
    const { hDateSunsetAwareString, type, afterSunset, gregorianDateString } = event;
    const rtn: EventDto[] = [];
    const date: Date = hDateSunsetAwareStringToDate(hDateSunsetAwareString);
    // add 1 after הפסק טהרה for ספירת 7 נקיים
    rtn.push({
      type: InputEventType.HEFSEK_TAHARA,
      date: date.toISOString().split('T')[0],
      textColor: '#a1a05cff',
      backgroundColor: '#e6f0ff', // Light blue background
      border: '1px solid #a1a05cff',
      details: [
        'הפסק טהרה',
      ]
    });
    for (let i = 1; i <= 7; i++) {
      date.setDate(date.getDate() + 1);
      rtn.push({
        type: DayType.SEVEN_CLEAN,
        date: date.toISOString().split('T')[0],
        textColor: '#3f4076ff',
        backgroundColor: '#fff3e6', // Light orange background
        border: '1px solid #8f9bddff',
        details: [
          `היום ה${i} של ספירת 7 נקיים`,
        ]
      })
      if (i === 7) rtn[i].details.push('בערב אפשר לטבול');
    }

    return rtn;
  }

  private buildPrishaEventVesetHaHodesh(event: CachedCalEvent, approach: Approach): EventDto {
    const { hDateSunsetAwareString, type, afterSunset, gregorianDateString } = event;
    let hDateVesetHaHodesh: HDate = hDateStringToHDate(hDateSunsetAwareString);
    hDateVesetHaHodesh = hDateVesetHaHodesh.add(1, 'MONTHS')
    const dateVesetHaHodesh = hDateVesetHaHodesh.greg();


    const rtn: EventDto = {
      type: DayType.PRISHA,
      date: dateVesetHaHodesh.toISOString().split('T')[0],
      textColor: '#ff006aff',
      border: '1px solid #ff006aff',
      backgroundColor: '#ffe6e6', // Light red background
      details: [
        'פרישה - וסט החודש',
      ]
    }
      ;
    if (approach.name === ApproachName.ASHKENAZI) rtn.details.push('ראוי לחשוש עונה אחת לפני');

    return rtn;
  }

  private buildPrishaEventOnaBenonit(event: CachedCalEvent, approach: Approach): EventDto {
    const { hDateSunsetAwareString, type, afterSunset, gregorianDateString } = event;
    const dateBenonit: Date = hDateSunsetAwareStringToDate(hDateSunsetAwareString);

    switch (approach.name) {
      case ApproachName.CHABAD:
        dateBenonit.setDate(dateBenonit.getDate() + 30);
        break;
      case ApproachName.ASHKENAZI:
      case ApproachName.SEPHARDI:
        dateBenonit.setDate(dateBenonit.getDate() + 30);
        if (afterSunset) dateBenonit.setDate(dateBenonit.getDate() - 1);

        break;
    }
    const rtn: EventDto =
    {
      type: DayType.PRISHA,
      date: dateBenonit.toISOString().split('T')[0],
      textColor: '#ff006aff',
      border: '1px solid #ff006aff',
      backgroundColor: '#ffe6e6', // Light red background
      details: [
        'פרישה - עונה בינונית',
      ]
    }

      ;
    if (approach.name === ApproachName.ASHKENAZI) rtn.details.push('ראוי לחשוש עונה אחת לפני');

    return rtn;
  }

  private buildEventsToHefsek(event: CachedCalEvent, allevents: CachedCalEvent[], index: number, numOfDays = 5): EventDto[] {
    const { hDateSunsetAwareString, type, afterSunset, gregorianDateString } = event;

    const rtn: EventDto[] = [];
    const date: Date = hDateSunsetAwareStringToDate(hDateSunsetAwareString);
    // prishaDate should be 30 days after 'date'
    const prishaDate = new Date(date);
    prishaDate.setDate(prishaDate.getDate() + 30);
    // מעיין פתוח
    for (let i = numOfDays; i > 0; i--) {

      rtn.push({
        type: DayType.MAAYAN_PATUAH,
        date: date.toISOString().split('T')[0],
        textColor: '#ff0000', // Red
        border: '1px solid #ff0000',
        backgroundColor: '#ffe6e6', // Light red background
        details: [
          `עוד ${i} ימים אפשר להתחיל לבדוק הפסק טהרה`,
        ]
      })
      date.setDate(date.getDate() + 1);
    }

    rtn.push({
      type: DayType.CAN_START_CHECK_HEFSEK,
      date: date.toISOString().split('T')[0],
      textColor: '#ff8800ff', // Red
      border: '1px solid #ff8800ff',
      backgroundColor: '#ffe6e6', // Light red background
      details: [
        'היום אפשר להתחיל לבדוק הפסק טהרה'
      ]
    });


    // add 1 after הפסק טהרה for ספירת 7 נקיים
    // for (let i = 1; i <= 7; i++) {
    //   date.setDate(date.getDate() + 1);

    //   const hebDate = dateToHDate(date, false);
    //   const another = allevents.find((eventObj: CachedCalEvent, eventIndex: number, events: CachedCalEvent[]) =>
    //     index !== eventIndex &&
    //     eventObj.hDateSunsetAwareString === hebDate.toString() &&
    //     eventObj.type === InputEventType.SEE_BLOOD
    //   );
    //   let anotherline = '';
    //   if (another) {
    //     const indexOfAnother = allevents.indexOf(another);
    //     allevents.splice(indexOfAnother, 1); // remove the found event to avoid duplicates
    //     console.log('removing from allevents', another);

    //     i = 1;
    //     anotherline
    //       = `היה דם ביום הזה, מתחילים לספור מחדש מ${another.hDateSunsetAwareString}`;

    //   }


    //   const toAddtoRtn: EventDto = {
    //     type: DayType.SEVEN_CLEAN,
    //     date: date.toISOString().split('T')[0],
    //     textColor: '#a1a05cff',
    //     backgroundColor: '#fff3e6', // Light orange background
    //     details: [
    //       `היום ה${i} של ספירת 7 נקיים`,
    //     ],
    //     border: '1px solid #a1a05cff',

    //   }
    //   !!anotherline && toAddtoRtn.details.push(anotherline);
    //   if (i === 7) {
    //     toAddtoRtn.type = DayType.MIKVEH_DAY;
    //     toAddtoRtn.textColor = '#00ff00'; // Green for the last day
    //     toAddtoRtn.border = '1px solid #00ff00';
    //     toAddtoRtn.backgroundColor = '#e6ffe6'; // Light green background
    //     toAddtoRtn.details.push('היום ה-7 נקיים, היום בערב אפשר לטבול');
    //   }



    //   rtn.push(toAddtoRtn);
    // }


    // const nextMonthsDate = hDateSunsetAwareStringToDate(event.hDateSunsetAwareString);
    // nextMonthsDate.setDate(nextMonthsDate.getDate() + 29);
    // rtn.push({
    //   type: DayType.MUTERET,
    //   date: nextMonthsDate.toISOString().split('T')[0],
    //   textColor: '#ff006aff',
    //   border: '1px solid #ff006aff',
    //   backgroundColor: '#ffe6e6', // Light red background
    //   details: [
    //     'היום ה-30, יש לבדוק',
    //   ]

    // });

    return rtn;


  }



}
