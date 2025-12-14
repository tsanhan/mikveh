import { inject, Injectable } from '@angular/core';
import { combineLatest, map, share, shareReplay } from 'rxjs';
import { CachedCalEvent, CachedInputEvent, CalEventDict, DayType, EventDto, InputEventType, InputSpecificEventType, OutputEvent } from '../interfaces/cal';
import { LocationService } from './location.service';
import { CacheService } from './cache.service';
import { Approach, ApproachName } from '../interfaces/approaches';
import { ApproachService } from './approach.service';
import { hDateStringToHDate, hDateSunsetAwareStringToDate, HDateToNgbDateStruct, NgbDateStructToHDate, simpleDateToHebrew } from '../utils/date.util';
import { HDate } from '@hebcal/core';
import { get, set } from 'lodash';

@Injectable({
  providedIn: 'root',
})
export class CalService {
  loc = inject(LocationService);
  cache = inject(CacheService);
  approach = inject(ApproachService);

  calEvents$ = this.cache.calEvents$;
  inputEvents$ = this.cache.inputEvents$.pipe(shareReplay(1));

  // highlightedDates$ = combineLatest([this.calEvents$, this.approach.approach$]).pipe(
  //   map(([calEvents, approach]: [CachedCalEvent[], Approach]) => {
  //     const events = [...calEvents];
  //     const rtn: EventDto[] = events.flatMap((calEvent: CachedCalEvent, index: number, entries: CachedCalEvent[]) => this.eventDto(calEvent, entries, index, approach));
  //     return rtn;
  //   })
  // );

  highlightedInputEvents$ = combineLatest([this.inputEvents$, this.approach.approach$]).pipe(
    map(([inputEvents, approach]: [CachedInputEvent[], Approach]) => {
      const list: OutputEvent[] = [];
      // split by veset
      const sortedInputEvents = inputEvents.sort((a, b) => a.simpleDate.getTime() - b.simpleDate.getTime());
      // after the next veset all the hashahot of the current vesset are not relevant
      for (const event of sortedInputEvents) {
        switch (event.specificType) {
          case InputSpecificEventType.VESET:
            const hashashotForVeset: OutputEvent[] = this.getNidaDaysHashashotForVeset(event, sortedInputEvents, approach);
            list.push(...hashashotForVeset)
            break;
          case InputSpecificEventType.BDIKA_TMEA:
          // if it 7 days from the vesset then no need to push the hashashot forward, if it is then we should.
          // next day can be tested for hefsek tahara
          case InputSpecificEventType.KETEM_TAME:
            // is is during 7 nekyim remove the 7 nekeyim
            // next day can be tested for hefsek tahara
            break;
        }
      }
      return list;
    }),
    map((list: OutputEvent[]) => {
      const rtn: CalEventDict = {};
      const aggregateDailyEvents = false;

      for (const event of list) {
        const { day, month, year } = event.date;
        if(aggregateDailyEvents){
          // get events from returned obj
          const events: OutputEvent[] = get(rtn, [year, month, day]) || [];
          // add new event
          events.push({ ...event });
          // reset the added events
          set(rtn, [year, month, day], [...events]);
        } else {
          // just set the most reset (relevant) event for that day
          set(rtn, [year, month, day], [{ ...event }]);
        }
      }
      return rtn;
    })
  );


  constructor() { }



  addEvent(event: CachedInputEvent) {
    this.cache.setInputEvents(event);
  }

  getNidaDaysHashashotForVeset(vesetEvent: CachedInputEvent, allEvents: CachedInputEvent[], approach: Approach): OutputEvent[] {

    const rtn: OutputEvent[] = [];


    const furstNidaDay: OutputEvent = {
      ...{ ...vesetEvent },
      CachedInputEventRef: { ...vesetEvent },
      outputEventType: DayType.VESET,
      details: [
        "ווסט החודש"
      ]
    }
    //MAHZOR
    const mahzorDays: OutputEvent[] = [];
    const forNum = (approach.name == ApproachName.SEPHARDI ? 4 : 5)
    for (let index = 1; index <= forNum; index++) {
      const { simpleDate } = vesetEvent;
      const newSimpleDate = new Date(simpleDate)
      newSimpleDate.setDate(simpleDate.getDate() + index);
      const hdate = simpleDateToHebrew(newSimpleDate)
      const date = HDateToNgbDateStruct(hdate)
      const nidaDay: OutputEvent = {
        CachedInputEventRef: { ...vesetEvent },
        simpleDate: newSimpleDate,
        date,
        outputEventType: DayType.MAHZOR,
        details: [
          `יום ${index} לנידה`
        ]
      }
      mahzorDays.push(nidaDay);
    }
    const { simpleDate } = vesetEvent;
    const newSimpleDate = new Date(simpleDate)

    // can start bdikot
    let startBdikotHDate = simpleDateToHebrew(newSimpleDate)
    startBdikotHDate = startBdikotHDate.add(forNum + 1, "DAYS");
    const startBdikotDate = HDateToNgbDateStruct(startBdikotHDate)
    const startBdikot: OutputEvent = {
      CachedInputEventRef: { ...vesetEvent },
      simpleDate: newSimpleDate,
      date: startBdikotDate,
      outputEventType: DayType.CAN_START_CHECK_HEFSEK,
      details: [
        `אפשר להתחיל לבדוק הפסק טהרה`
      ]
    }


    // hashash binonit
    let hashashBinonitHDate = simpleDateToHebrew(newSimpleDate)
    hashashBinonitHDate = hashashBinonitHDate.add(1, "M");
    const hashashBinonitDate = HDateToNgbDateStruct(hashashBinonitHDate)
    const hashashBinonit: OutputEvent = {
      CachedInputEventRef: { ...vesetEvent },
      simpleDate: newSimpleDate,
      date: hashashBinonitDate,
      outputEventType: DayType.PRISHA,
      details: [
        `חשש בינונית`
      ]
    }

    rtn.push(furstNidaDay);
    rtn.push(...mahzorDays);
    rtn.push(startBdikot);
    rtn.push(hashashBinonit);


    return rtn;
  }
  // private eventDto(event: CachedCalEvent, allevents: CachedCalEvent[], index: number, approach: Approach): EventDto[] {
  //   const { type } = event;

  //   let followingEventsChabadOnaBenonit: EventDto[] = [];



  //   switch (type) {
  //     case InputEventType.SEE_BLOOD:
  //       switch (approach.name) {
  //         case ApproachName.ASHKENAZI:
  //         case ApproachName.CHABAD:
  //           followingEventsChabadOnaBenonit = this.buildEventsToHefsek(event, allevents, index);
  //           break;
  //         case ApproachName.SEPHARDI:
  //           followingEventsChabadOnaBenonit = this.buildEventsToHefsek(event, allevents, index, 4);
  //           break;
  //       }
  //       followingEventsChabadOnaBenonit.push(this.buildPrishaEventOnaBenonit(event, approach));
  //       followingEventsChabadOnaBenonit.push(this.buildPrishaEventVesetHaHodesh(event, approach));
  //       break;
  //     case InputEventType.HEFSEK_TAHARA:
  //       switch (approach.name) {
  //         case ApproachName.CHABAD:
  //         case ApproachName.ASHKENAZI:
  //         case ApproachName.SEPHARDI:
  //           followingEventsChabadOnaBenonit = this.buildEvents7CleanToPrisha(event, allevents, index);
  //           break;
  //       }

  //   }

  //   return [
  //     ...followingEventsChabadOnaBenonit
  //   ];
  // }

  // private buildEvents7CleanToPrisha(event: CachedCalEvent, allevents: CachedCalEvent[], index: number): EventDto[] {
  //   const { hDateSunsetAwareString } = event;
  //   const rtn: EventDto[] = [];
  //   const date: Date = hDateSunsetAwareStringToDate(hDateSunsetAwareString);
  //   // add 1 after הפסק טהרה for ספירת 7 נקיים
  //   rtn.push({
  //     type: InputEventType.HEFSEK_TAHARA,
  //     date: date.toISOString().split('T')[0],
  //     details: [
  //       'הפסק טהרה',
  //     ]
  //   });
  //   for (let i = 1; i <= 7; i++) {
  //     date.setDate(date.getDate() + 1);
  //     switch (i) {
  //       case 7:
  //         rtn.push({
  //           type: DayType.MIKVEH_DAY,
  //           date: date.toISOString().split('T')[0],
  //           details: [
  //             `היום ה${i} של ספירת 7 נקיים`,
  //             'בערב אפשר לטבול'
  //           ]
  //         });
  //         break;
  //       default:
  //         rtn.push({
  //           type: DayType.SEVEN_CLEAN,
  //           date: date.toISOString().split('T')[0],
  //           details: [
  //             `היום ה${i} של ספירת 7 נקיים`,
  //           ]
  //         });
  //         break;
  //     }
  //   }


  //   return rtn;
  // }

  // private buildPrishaEventVesetHaHodesh(event: CachedCalEvent, approach: Approach): EventDto {
  //   const { hDateSunsetAwareString } = event;
  //   let hDateVesetHaHodesh: HDate = hDateStringToHDate(hDateSunsetAwareString);
  //   hDateVesetHaHodesh = hDateVesetHaHodesh.add(1, 'MONTHS')
  //   const dateVesetHaHodesh = hDateVesetHaHodesh.greg();


  //   const rtn: EventDto = {
  //     type: DayType.PRISHA,
  //     date: dateVesetHaHodesh.toISOString().split('T')[0],
  //     details: [
  //       'פרישה - וסט החודש',
  //     ]
  //   }
  //     ;
  //   if (approach.name === ApproachName.ASHKENAZI) rtn.details.push('ראוי לחשוש עונה אחת לפני');

  //   return rtn;
  // }

  // private buildPrishaEventOnaBenonit(event: CachedCalEvent, approach: Approach): EventDto {
  //   const { hDateSunsetAwareString, afterSunset } = event;
  //   const dateBenonit: Date = hDateSunsetAwareStringToDate(hDateSunsetAwareString);

  //   switch (approach.name) {
  //     case ApproachName.CHABAD:
  //       dateBenonit.setDate(dateBenonit.getDate() + 30);
  //       break;
  //     case ApproachName.ASHKENAZI:
  //     case ApproachName.SEPHARDI:
  //       dateBenonit.setDate(dateBenonit.getDate() + 30);
  //       if (afterSunset) dateBenonit.setDate(dateBenonit.getDate() - 1);

  //       break;
  //   }
  //   const rtn: EventDto =
  //   {
  //     type: DayType.PRISHA,
  //     date: dateBenonit.toISOString().split('T')[0],
  //     details: [
  //       'פרישה - עונה בינונית',
  //     ]
  //   }

  //     ;
  //   if (approach.name === ApproachName.ASHKENAZI) rtn.details.push('ראוי לחשוש עונה אחת לפני');

  //   return rtn;
  // }

  // private buildEventsToHefsek(event: CachedCalEvent, allevents: CachedCalEvent[], index: number, numOfDays = 5): EventDto[] {
  //   const { hDateSunsetAwareString } = event;

  //   const rtn: EventDto[] = [];
  //   const date: Date = hDateSunsetAwareStringToDate(hDateSunsetAwareString);
  //   // prishaDate should be 30 days after 'date'
  //   const prishaDate = new Date(date);
  //   prishaDate.setDate(prishaDate.getDate() + 30);
  //   // מעיין פתוח
  //   for (let i = numOfDays; i > 0; i--) {

  //     rtn.push({
  //       type: DayType.MAHZOR,
  //       date: date.toISOString().split('T')[0],
  //       details: [
  //         `עוד ${i} ימים אפשר להתחיל לבדוק הפסק טהרה`,
  //       ]
  //     })
  //     date.setDate(date.getDate() + 1);
  //   }

  //   rtn.push({
  //     type: DayType.CAN_START_CHECK_HEFSEK,
  //     date: date.toISOString().split('T')[0],
  //     details: [
  //       'היום אפשר להתחיל לבדוק הפסק טהרה'
  //     ]
  //   });
  //   return rtn;


  // }



}
