import { inject, Injectable } from '@angular/core';
import { combineLatest, map } from 'rxjs';
import { CachedCalEvent, DayType, EventDto, InputEvent, InputEventType } from '../interfaces/cal';
import { LocationService } from './location.service';
import { CacheService } from './cache.service';
import { Approach, ApproachName } from '../interfaces/approaches';
import { ApproachService } from './approach.service';
import { hDateStringToHDate, hDateSunsetAwareStringToDate } from '../utils/date.util';
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


  // async addEvent(date: Date, type: InputEventType, afterSunset: boolean) {
  //   afterSunset = type === InputEventType.HEFSEK_TAHARA ? false : afterSunset; // hefsek is always during the day
  //   const hdate = dateToHDate(date, afterSunset);


  //   const event: CachedCalEvent = {
  //     type,
  //     hDateSunsetAwareString: hdate.toString(),
  //     afterSunset,
  //     gregorianDateString: date.toISOString().split('T')[0],
  //   };
  //   this.cache.setCalEvent(event);
  // }

  async addEvent(event: InputEvent) {
    this.cache.setInputEvent(event);
  }

  private eventDto(event: CachedCalEvent, allevents: CachedCalEvent[], index: number, approach: Approach): EventDto[] {
    const { type } = event;

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
    const { hDateSunsetAwareString } = event;
    const rtn: EventDto[] = [];
    const date: Date = hDateSunsetAwareStringToDate(hDateSunsetAwareString);
    // add 1 after הפסק טהרה for ספירת 7 נקיים
    rtn.push({
      type: InputEventType.HEFSEK_TAHARA,
      date: date.toISOString().split('T')[0],
      details: [
        'הפסק טהרה',
      ]
    });
    for (let i = 1; i <= 7; i++) {
      date.setDate(date.getDate() + 1);
      switch (i) {
        case 7:
          rtn.push({
            type: DayType.MIKVEH_DAY,
            date: date.toISOString().split('T')[0],
            details: [
              `היום ה${i} של ספירת 7 נקיים`,
              'בערב אפשר לטבול'
            ]
          });
          break;
        default:
          rtn.push({
            type: DayType.SEVEN_CLEAN,
            date: date.toISOString().split('T')[0],
            details: [
              `היום ה${i} של ספירת 7 נקיים`,
            ]
          });
          break;
      }
    }


    return rtn;
  }

  private buildPrishaEventVesetHaHodesh(event: CachedCalEvent, approach: Approach): EventDto {
    const { hDateSunsetAwareString } = event;
    let hDateVesetHaHodesh: HDate = hDateStringToHDate(hDateSunsetAwareString);
    hDateVesetHaHodesh = hDateVesetHaHodesh.add(1, 'MONTHS')
    const dateVesetHaHodesh = hDateVesetHaHodesh.greg();


    const rtn: EventDto = {
      type: DayType.PRISHA,
      date: dateVesetHaHodesh.toISOString().split('T')[0],
      details: [
        'פרישה - וסט החודש',
      ]
    }
      ;
    if (approach.name === ApproachName.ASHKENAZI) rtn.details.push('ראוי לחשוש עונה אחת לפני');

    return rtn;
  }

  private buildPrishaEventOnaBenonit(event: CachedCalEvent, approach: Approach): EventDto {
    const { hDateSunsetAwareString, afterSunset } = event;
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
      details: [
        'פרישה - עונה בינונית',
      ]
    }

      ;
    if (approach.name === ApproachName.ASHKENAZI) rtn.details.push('ראוי לחשוש עונה אחת לפני');

    return rtn;
  }

  private buildEventsToHefsek(event: CachedCalEvent, allevents: CachedCalEvent[], index: number, numOfDays = 5): EventDto[] {
    const { hDateSunsetAwareString } = event;

    const rtn: EventDto[] = [];
    const date: Date = hDateSunsetAwareStringToDate(hDateSunsetAwareString);
    // prishaDate should be 30 days after 'date'
    const prishaDate = new Date(date);
    prishaDate.setDate(prishaDate.getDate() + 30);
    // מעיין פתוח
    for (let i = numOfDays; i > 0; i--) {

      rtn.push({
        type: DayType.MAHZOR,
        date: date.toISOString().split('T')[0],
        details: [
          `עוד ${i} ימים אפשר להתחיל לבדוק הפסק טהרה`,
        ]
      })
      date.setDate(date.getDate() + 1);
    }

    rtn.push({
      type: DayType.CAN_START_CHECK_HEFSEK,
      date: date.toISOString().split('T')[0],
      details: [
        'היום אפשר להתחיל לבדוק הפסק טהרה'
      ]
    });
    return rtn;


  }



}
