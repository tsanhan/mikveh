import { inject, Injectable } from '@angular/core';
import { combineLatest, map, share, shareReplay } from 'rxjs';
import { CachedCalEvent, CachedInputEvent, CalEventDict, DayType, EventDto, InputEventOna, InputEventType, OutputEvent } from '../interfaces/cal';
import { LocationService } from './location.service';
import { CacheService } from './cache.service';
import { Approach, ApproachName } from '../interfaces/approaches';
import { ApproachService } from './approach.service';
import { HDateToNgbDateStruct, simpleDateToHebrew } from '../utils/date.util';
import { get, set } from 'lodash';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const nidaDaysFor = (approach: Approach) =>
  approach.name === ApproachName.SEPHARDI_OVADIA ? 4 : 5;
const nidaDaysForInputEvent = (event: CachedInputEvent, approach: Approach) =>
  event.type === InputEventType.VESET ? nidaDaysFor(approach) : 5;
const KETEM_OVADIA_LENIENCY_NOTE =
  'לפי שיטת הרב עובדיה יש דעה מקילה בכתם שאפשר לעשות הפסק טהרה לפני 4 ימים. ראי בהסברים: הפסק טהרה ושבעה נקיים, ובמקרה מעשי שאלי רב.';

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
      const sortedInputEvents = inputEvents.sort(
        (a, b) => new Date(a.simpleDate).getTime() - new Date(b.simpleDate).getTime(),
      );
      // Sighting events that have already been absorbed into an earlier
      // niddah chain – don't generate a second Hefsek for them.
      const handled = new Set<CachedInputEvent>();
      for (const event of sortedInputEvents) {
        if (handled.has(event)) continue;
        switch (event.type) {
          case InputEventType.VESET: {
            const chainLast = this.extendChain(event, sortedInputEvents, approach, handled);
            const hashashotForVeset: OutputEvent[] = this.getNidaDaysHashashotForVeset(event, chainLast, approach);
            list.push(...hashashotForVeset);
            break;
          }
          case InputEventType.BDIKA_TMEA: {
            const chainLast = this.extendChain(event, sortedInputEvents, approach, handled);
            const hashashotForBdika: OutputEvent[] = this.getNidaDaysForSighting(event, chainLast, approach, true);
            list.push(...hashashotForBdika);
            break;
          }
          case InputEventType.KETEM_TAME: {
            const chainLast = this.extendChain(event, sortedInputEvents, approach, handled);
            const nidaDaysForKetem: OutputEvent[] = this.getNidaDaysForSighting(event, chainLast, approach, false);
            list.push(...nidaDaysForKetem);
            break;
          }
          case InputEventType.HEFSEK_TAHARA: {
            const sevenCleanDays: OutputEvent[] = this.getSevenCleanDays(event, sortedInputEvents, approach);
            list.push(...sevenCleanDays);
            break;
          }
        }
      }
      return list;
    }),
    map((list: OutputEvent[]) => {
      const rtn: CalEventDict = {};
      const aggregateDailyEvents = true;

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

  removeEvent(event: CachedInputEvent) {
    this.cache.removeInputEvent(event);
    const remaining = this.cache.getInputEvents();
    const orphanedHefsekim = remaining.filter((e: CachedInputEvent) => {
      if (e.type !== InputEventType.HEFSEK_TAHARA) return false;
      const t = new Date(e.simpleDate).getTime();
      return !remaining.some((o: CachedInputEvent) =>
        (o.type === InputEventType.VESET ||
          o.type === InputEventType.KETEM_TAME ||
          o.type === InputEventType.BDIKA_TMEA) &&
        new Date(o.simpleDate).getTime() <= t,
      );
    });
    for (const orphan of orphanedHefsekim) {
      this.cache.removeInputEvent(orphan);
    }
  }

  /**
   * Returns true if a Hefsek Tahara can be added on `date` – i.e. there is at
   * least one prior sighting (Veset / Ketem Tame / Bdika Tmea) on or before
   * that date.
   */
  canAddHefsekTahara(date: Date): boolean {
    const t = new Date(date).getTime();
    return this.cache.getInputEvents().some(e =>
      (e.type === InputEventType.VESET ||
        e.type === InputEventType.KETEM_TAME ||
        e.type === InputEventType.BDIKA_TMEA) &&
      new Date(e.simpleDate).getTime() <= t,
    );
  }

  /**
   * Returns null if the new event is allowed, or an error message in Hebrew otherwise.
   * Currently blocks a Hefsek Tahara that is added too close to (or before) the
   * latest sighting event – the woman has enough Niddah days before a Hefsek
   * Tahara is meaningful. Veset follows the selected approach; Ketem Tame and
   * Bdika Tmea always require 5 days.
   */
  validateNewInputEvent(event: CachedInputEvent): string | null {
    if (event.type !== InputEventType.HEFSEK_TAHARA) return null;

    const approach = this.approach.approach$.getValue();
    const allEvents = this.cache.getInputEvents();
    const newDate = new Date(event.simpleDate).getTime();

    const lastVesetOrKetem = allEvents
      .filter((e: CachedInputEvent) =>
        (e.type === InputEventType.VESET ||
          e.type === InputEventType.KETEM_TAME ||
          e.type === InputEventType.BDIKA_TMEA) &&
        new Date(e.simpleDate).getTime() <= newDate)
      .sort((a: CachedInputEvent, b: CachedInputEvent) =>
        new Date(b.simpleDate).getTime() - new Date(a.simpleDate).getTime())[0];

    if (!lastVesetOrKetem) {
      return 'לא ניתן להוסיף הפסק טהרה ללא וסת, כתם טמא או בדיקה טמאה קודם';
    }

    const minNidaDays = nidaDaysForInputEvent(lastVesetOrKetem, approach);
    const diffDays = Math.floor(
      (newDate - new Date(lastVesetOrKetem.simpleDate).getTime()) / MS_PER_DAY,
    );
    // The bleeding day itself counts as day 1 of niddah, so the earliest
    // possible Hefsek Tahara is on day `minNidaDays` → diff of `minNidaDays - 1`.
    const minDiff = minNidaDays - 1;
    if (diffDays < minDiff) {
      const missing = minDiff - diffDays;
      return `לא ניתן להוסיף הפסק טהרה, נדרשים לפחות ${minNidaDays} ימי נידה מהווסת/כתם/בדיקה האחרון (חסרים ${missing} ימים)`;
    }
    return null;
  }

  /**
   * Walks forward from `start` and absorbs any sighting event that falls within
   * the current niddah window. Returns the last event in the chain.
   * All absorbed events are added to the `handled` set so the caller will
   * not generate a separate Hefsek Tahara marker for them.
   */
  private extendChain(
    start: CachedInputEvent,
    sortedEvents: CachedInputEvent[],
    approach: Approach,
    handled: Set<CachedInputEvent>,
  ): CachedInputEvent {
    handled.add(start);
    let latest = start;
    let extended = true;
    while (extended) {
      extended = false;
      const cutoff = new Date(latest.simpleDate);
      const forNum = nidaDaysForInputEvent(latest, approach);
      cutoff.setDate(cutoff.getDate() + forNum - 1);
      const cutoffT = cutoff.getTime();
      const latestT = new Date(latest.simpleDate).getTime();
      for (const e of sortedEvents) {
        if (handled.has(e)) continue;
        if (!this.isSightingEvent(e)) continue;
        const t = new Date(e.simpleDate).getTime();
        if (t > latestT && t <= cutoffT) {
          latest = e;
          handled.add(e);
          extended = true;
        }
      }
    }
    return latest;
  }

  getSevenCleanDays(hefsekTaharaEvent: CachedInputEvent, allEvents: CachedInputEvent[], approach: Approach): OutputEvent[] {
    const rtn: OutputEvent[] = [];
    for (let index = 1; index <= 7; index++) {
      const { simpleDate } = hefsekTaharaEvent;
      const newSimpleDate = new Date(simpleDate)
      newSimpleDate.setDate(simpleDate.getDate() + index);
      const hdate = simpleDateToHebrew(newSimpleDate)
      const date = HDateToNgbDateStruct(hdate)

      const nekyimDay: OutputEvent = {
        CachedInputEventRef: { ...hefsekTaharaEvent },
        simpleDate: newSimpleDate,
        date,
        outputEventType: DayType.SEVEN_CLEAN,
        details: [
          `יום ${index}/7 נקיים`
        ]
      }
      rtn.push(nekyimDay);

      if (index === 7) {
        const mikvehDay: OutputEvent = {
          CachedInputEventRef: { ...hefsekTaharaEvent },
          simpleDate: newSimpleDate,
          date,
          outputEventType: DayType.MIKVEH_DAY,
          details: [
            'בערב טבילה במקווה',
          ],
        };
        rtn.push(mikvehDay);
      }
    }
    return rtn;
  }
  getNidaDaysHashashotForVeset(
    vesetEvent: CachedInputEvent,
    chainLast: CachedInputEvent,
    approach: Approach,
  ): OutputEvent[] {
    return this.getNidaDaysForSighting(vesetEvent, chainLast, approach, true);
  }

  getNidaDaysForSighting(
    sightingEvent: CachedInputEvent,
    chainLast: CachedInputEvent,
    approach: Approach,
    includeHashashot: boolean,
  ): OutputEvent[] {
    const rtn: OutputEvent[] = [];
    const onaLabel = sightingEvent.ona === InputEventOna.LAYLA ? 'לילה' : 'יום';
    const forNum = nidaDaysForInputEvent(chainLast, approach);
    const detailsSuffix = this.detailsSuffixForSighting(sightingEvent, approach);

    const vesetSimpleDate = new Date(sightingEvent.simpleDate);
    const chainLastDate = new Date(chainLast.simpleDate);
    // Niddah days run from the first sighting up to (chainLast + forNum - 1),
    // because the sighting day itself counts as day 1 of niddah.
    const totalNidaDays =
      Math.floor((chainLastDate.getTime() - vesetSimpleDate.getTime()) / MS_PER_DAY) + forNum;

    const furstNidaDay: OutputEvent = {
      ...{ ...sightingEvent },
      CachedInputEventRef: { ...sightingEvent },
      outputEventType: sightingEvent.type,
      details: [
        `${this.sightingLabel(sightingEvent)} – יום 1 לנידה`,
        ...detailsSuffix,
      ]
    }
    // niddah days 2..totalNidaDays
    const mahzorDays: OutputEvent[] = [];
    for (let index = 1; index < totalNidaDays; index++) {
      const newSimpleDate = new Date(vesetSimpleDate);
      newSimpleDate.setDate(vesetSimpleDate.getDate() + index);
      const hdate = simpleDateToHebrew(newSimpleDate)
      const date = HDateToNgbDateStruct(hdate)
      const nidaDay: OutputEvent = {
        CachedInputEventRef: { ...sightingEvent },
        simpleDate: newSimpleDate,
        date,
        outputEventType: DayType.MAHZOR,
        details: [
          `יום ${index + 1} לנידה`,
          ...detailsSuffix,
        ]
      }
      mahzorDays.push(nidaDay);
    }

    // Hefsek Tahara is done on the last niddah day (afternoon),
    // i.e. `chainLast + forNum - 1` days.
    const startBdikotSimpleDate = new Date(chainLastDate);
    startBdikotSimpleDate.setDate(chainLastDate.getDate() + forNum - 1);
    const startBdikotHDate = simpleDateToHebrew(startBdikotSimpleDate);
    const startBdikotDate = HDateToNgbDateStruct(startBdikotHDate);
    const startBdikot: OutputEvent = {
      CachedInputEventRef: { ...sightingEvent },
      simpleDate: startBdikotSimpleDate,
      date: startBdikotDate,
      outputEventType: DayType.CAN_START_CHECK_HEFSEK,
      details: [
        `אפשר להתחיל לבדוק הפסק טהרה`,
        ...detailsSuffix,
      ]
    }

    rtn.push(furstNidaDay);
    rtn.push(...mahzorDays);
    rtn.push(startBdikot);
    if (includeHashashot) {
      // Hashash Onah Beinonit:
      //   30 *solar* days after the sighting (NOT one Hebrew month).
      //   The hashash falls on the same ona (day / night) as the original sighting.
      const onaBeinonitSimpleDate = new Date(vesetSimpleDate);
      onaBeinonitSimpleDate.setDate(vesetSimpleDate.getDate() + 30);
      const onaBeinonitHDate = simpleDateToHebrew(onaBeinonitSimpleDate);
      const hashashOnaBeinonit: OutputEvent = {
        CachedInputEventRef: { ...sightingEvent },
        simpleDate: onaBeinonitSimpleDate,
        date: HDateToNgbDateStruct(onaBeinonitHDate),
        outputEventType: DayType.ONA_BEINONIT,
        details: [
          `חשש עונה בינונית`
        ]
      }

      // Hashash Veset HaChodesh:
      //   Same Hebrew day, next Hebrew month.
      //   The hashash falls on the same ona (day / night) as the original sighting.
      const vesetHaChodeshHDate = simpleDateToHebrew(vesetSimpleDate).add(1, "M");
      const vesetHaChodeshType = sightingEvent.ona === InputEventOna.LAYLA
        ? DayType.VESET_HACHODESH_NIGHT
        : DayType.VESET_HACHODESH_DAY;
      const hashashVesetHaChodesh: OutputEvent = {
        CachedInputEventRef: { ...sightingEvent },
        simpleDate: vesetHaChodeshHDate.greg(),
        date: HDateToNgbDateStruct(vesetHaChodeshHDate),
        outputEventType: vesetHaChodeshType,
        details: [
          `חשש וסת החודש - ${onaLabel}`
        ]
      }

      rtn.push(hashashOnaBeinonit);
      rtn.push(hashashVesetHaChodesh);
    }

    return rtn;
  }

  private isSightingEvent(event: CachedInputEvent): boolean {
    return event.type === InputEventType.VESET ||
      event.type === InputEventType.KETEM_TAME ||
      event.type === InputEventType.BDIKA_TMEA;
  }

  private sightingLabel(event: CachedInputEvent): string {
    switch (event.type) {
      case InputEventType.KETEM_TAME:
        return 'כתם טמא';
      case InputEventType.BDIKA_TMEA:
        return 'בדיקה טמאה';
      case InputEventType.VESET:
      default:
        return 'ווסת';
    }
  }

  private detailsSuffixForSighting(event: CachedInputEvent, approach: Approach): string[] {
    if (
      event.type === InputEventType.KETEM_TAME &&
      approach.name === ApproachName.SEPHARDI_OVADIA
    ) {
      return [KETEM_OVADIA_LENIENCY_NOTE];
    }
    return [];
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
