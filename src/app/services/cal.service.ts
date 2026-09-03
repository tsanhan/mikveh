import { inject, Injectable } from '@angular/core';
import { combineLatest, map, share, shareReplay } from 'rxjs';
import { CachedCalEvent, CachedInputEvent, CalEventDict, DayType, EventDto, FixedVesetPattern, HebrewDateKey, InputEventOna, InputEventType, OnahRef, OutputEvent, VesetPatternState } from '../interfaces/cal';
import { LocationService } from './location.service';
import { CacheService } from './cache.service';
import { Approach, ApproachName } from '../interfaces/approaches';
import { ApproachService } from './approach.service';
import { addHebrewDays, addHebrewMonths, HDateToNgbDateStruct, hDateToHebrewDateKey, hebrewDateKeyToHDate, sameHebrewDayInNextMonth, simpleDateToHebrew } from '../utils/date.util';
import { get, set } from 'lodash';
import { HDate } from '@hebcal/core';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
/** Practical calendar-rendering horizon for an active monthly fixed veset. */
const FIXED_VESET_FUTURE_MONTHS = 120;
const nidaDaysFor = (approach: Approach) =>
  approach.name === ApproachName.SEPHARDI_OVADIA ? 4 : 5;
const nidaDaysForInputEvent = (event: CachedInputEvent, approach: Approach) =>
  event.type === InputEventType.VESET ||
  event.type === InputEventType.BDIKA_TMEA ||
  (event.type === InputEventType.KETEM_TAME && approach.name === ApproachName.SEPHARDI_OVADIA)
    ? nidaDaysFor(approach)
    : 5;
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
      const sortedInputEvents = [...inputEvents].sort((a, b) => this.compareInputEvents(a, b));
      // Sighting events that have already been absorbed into an earlier
      // niddah chain – don't generate a second Hefsek for them.
      const handled = new Set<CachedInputEvent>();
      for (const event of sortedInputEvents) {
        if (handled.has(event)) continue;
        switch (event.type) {
          case InputEventType.VESET: {
            const chainLast = this.extendChain(event, sortedInputEvents, approach, handled);
            const hashashotForVeset: OutputEvent[] = this.getNidaDaysHashashotForVeset(
              event,
              chainLast,
              approach,
              this.suppressesOnahBeinonitAt(event, sortedInputEvents, approach),
            );
            list.push(...hashashotForVeset);
            break;
          }
          case InputEventType.BDIKA_TMEA: {
            const chainLast = this.extendChain(event, sortedInputEvents, approach, handled);
            const hashashotForBdika: OutputEvent[] = this.getNidaDaysForSighting(
              event,
              chainLast,
              approach,
              true,
              this.suppressesOnahBeinonitAt(event, sortedInputEvents, approach),
            );
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
      list.push(...this.getFixedVesetConcerns(sortedInputEvents, approach));
      list.push(...this.getHaflagaHashashot(sortedInputEvents, approach));
      return list;
    }),
    map((list: OutputEvent[]) => {
      const rtn: CalEventDict = {};
      const aggregateDailyEvents = true;

      for (const event of list) {
        const occupiedDates = new Map<string, HebrewDateKey>();
        for (const segment of event.segments) {
          const date = segment.hebrewDate;
          occupiedDates.set(`${date.year}-${date.month}-${date.day}`, date);
        }

        for (const occupiedDate of occupiedDates.values()) {
          const { day, month, year } = HDateToNgbDateStruct(hebrewDateKeyToHDate(occupiedDate));
          if(aggregateDailyEvents){
            const events: OutputEvent[] = get(rtn, [year, month, day]) || [];
            events.push({ ...event });
            set(rtn, [year, month, day], [...events]);
          } else {
            set(rtn, [year, month, day], [{ ...event }]);
          }
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

  canAddHefsekTahara(date: Date): boolean {
    const approach = this.approach.approach$.getValue();
    const t = this.startOfDayMs(date);
    const latestSighting = this.latestSightingOnOrBefore(t);
    if (!latestSighting) return false;
    if (this.hasHefsekOnOrAfter(latestSighting)) return false;

    return this.daysSince(latestSighting, t) >= this.minHefsekDiff(latestSighting, approach);
  }

  /**
   * Returns null if the new event is allowed, or an error message in Hebrew otherwise.
   * Currently blocks a Hefsek Tahara that is added too close to (or before) the
   * latest sighting event – the woman has enough Niddah days before a Hefsek
   * Tahara is meaningful. Veset and Bdika Tmea follow the selected approach;
   * Ketem Tame keeps its separate rule.
   */
  validateNewInputEvent(event: CachedInputEvent): string | null {
    if (event.type !== InputEventType.HEFSEK_TAHARA) return null;

    const approach = this.approach.approach$.getValue();
    const newDate = this.startOfDayMs(event.simpleDate);

    const lastVesetOrKetem = this.latestSightingOnOrBefore(newDate);

    if (!lastVesetOrKetem) {
      return 'לא ניתן להוסיף הפסק טהרה ללא וסת, כתם טמא או בדיקה טמאה קודם';
    }

    if (this.hasHefsekOnOrAfter(lastVesetOrKetem)) {
      return 'כבר נוסף הפסק טהרה לאחר הווסת/הכתם/הבדיקה האחרונים';
    }

    const minNidaDays = nidaDaysForInputEvent(lastVesetOrKetem, approach);
    const diffDays = this.daysSince(lastVesetOrKetem, newDate);
    const minDiff = this.minHefsekDiff(lastVesetOrKetem, approach);
    if (diffDays < minDiff) {
      const missing = minDiff - diffDays;
      return `לא ניתן להוסיף הפסק טהרה, נדרשים לפחות ${minNidaDays} ימי נידה מהווסת/כתם/בדיקה האחרון (חסרים ${missing} ימים)`;
    }
    return null;
  }

  private latestSightingOnOrBefore(dateMs: number): CachedInputEvent | undefined {
    return this.cache.getInputEvents()
      .filter((e: CachedInputEvent) =>
        this.isSightingEvent(e) &&
        this.startOfDayMs(e.simpleDate) <= dateMs)
      .sort((a: CachedInputEvent, b: CachedInputEvent) =>
        this.startOfDayMs(b.simpleDate) - this.startOfDayMs(a.simpleDate))[0];
  }

  private hasHefsekOnOrAfter(sighting: CachedInputEvent): boolean {
    const sightingDate = this.startOfDayMs(sighting.simpleDate);
    return this.cache.getInputEvents().some((event: CachedInputEvent) =>
      event.type === InputEventType.HEFSEK_TAHARA &&
      this.startOfDayMs(event.simpleDate) >= sightingDate,
    );
  }

  private daysSince(event: CachedInputEvent, dateMs: number): number {
    return Math.floor(
      (dateMs - this.startOfDayMs(event.simpleDate)) / MS_PER_DAY,
    );
  }

  private startOfDayMs(date: Date): number {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  private minHefsekDiff(event: CachedInputEvent, approach: Approach): number {
    // The bleeding day itself counts as day 1 of niddah, so the earliest
    // possible Hefsek Tahara is on day `minNidaDays` -> diff of `minNidaDays - 1`.
    return nidaDaysForInputEvent(event, approach) - 1;
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
        id: this.concernId(DayType.SEVEN_CLEAN, hefsekTaharaEvent, hdate),
        sourceEventId: hefsekTaharaEvent.id,
        segments: this.fullHebrewDateSegments(hDateToHebrewDateKey(hdate)),
        CachedInputEventRef: { ...hefsekTaharaEvent },
        simpleDate: newSimpleDate,
        date,
        outputEventType: DayType.SEVEN_CLEAN,
        details: [
          `יום ${index}/7 נקיים`
        ]
      }
      rtn.push(nekyimDay);
    }

    // The seven clean days must be complete before immersion. The mikveh is
    // therefore marked in the night on day 8, not on day 7 itself.
    const mikvehSimpleDate = new Date(hefsekTaharaEvent.simpleDate);
    mikvehSimpleDate.setDate(hefsekTaharaEvent.simpleDate.getDate() + 8);
    const mikvehHDate = simpleDateToHebrew(mikvehSimpleDate);
    const mikvehDay: OutputEvent = {
      id: this.concernId(DayType.MIKVEH_DAY, hefsekTaharaEvent, mikvehHDate),
      sourceEventId: hefsekTaharaEvent.id,
      segments: [this.onahRef(hDateToHebrewDateKey(mikvehHDate), InputEventOna.NIGHT)],
      CachedInputEventRef: { ...hefsekTaharaEvent },
      simpleDate: mikvehSimpleDate,
      date: HDateToNgbDateStruct(mikvehHDate),
      outputEventType: DayType.MIKVEH_DAY,
      details: [
        'בערב טבילה במקווה',
      ],
    };
    rtn.push(mikvehDay);

    return rtn;
  }
  getNidaDaysHashashotForVeset(
    vesetEvent: CachedInputEvent,
    chainLast: CachedInputEvent,
    approach: Approach,
    suppressOnahBeinonit = false,
  ): OutputEvent[] {
    return this.getNidaDaysForSighting(
      vesetEvent,
      chainLast,
      approach,
      true,
      suppressOnahBeinonit,
    );
  }

  getNidaDaysForSighting(
    sightingEvent: CachedInputEvent,
    chainLast: CachedInputEvent,
    approach: Approach,
    includeHashashot: boolean,
    suppressOnahBeinonit = false,
  ): OutputEvent[] {
    const rtn: OutputEvent[] = [];
    const forNum = nidaDaysForInputEvent(chainLast, approach);

    const vesetSimpleDate = new Date(sightingEvent.simpleDate);
    const chainLastDate = new Date(chainLast.simpleDate);
    // Niddah days run from the first sighting up to (chainLast + forNum - 1),
    // because the sighting day itself counts as day 1 of niddah.
    const totalNidaDays =
      Math.floor((chainLastDate.getTime() - vesetSimpleDate.getTime()) / MS_PER_DAY) + forNum;

    const firstNidaDay: OutputEvent = {
      id: this.concernId(sightingEvent.type, sightingEvent, simpleDateToHebrew(vesetSimpleDate)),
      sourceEventId: sightingEvent.id,
      segments: [this.onahRef(sightingEvent.hebrewDate, sightingEvent.ona)],
      simpleDate: vesetSimpleDate,
      date: HDateToNgbDateStruct(simpleDateToHebrew(vesetSimpleDate)),
      CachedInputEventRef: { ...sightingEvent },
      outputEventType: sightingEvent.type,
      details: [
        `${this.sightingLabel(sightingEvent)} – יום 1 לנידה`,
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
        id: this.concernId(DayType.MAHZOR, sightingEvent, hdate),
        sourceEventId: sightingEvent.id,
        segments: this.fullHebrewDateSegments(hDateToHebrewDateKey(hdate)),
        CachedInputEventRef: { ...sightingEvent },
        simpleDate: newSimpleDate,
        date,
        outputEventType: DayType.MAHZOR,
        details: [
          `יום ${index + 1} לנידה`,
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
      id: this.concernId(DayType.CAN_START_CHECK_HEFSEK, sightingEvent, startBdikotHDate),
      sourceEventId: sightingEvent.id,
      segments: [this.onahRef(hDateToHebrewDateKey(startBdikotHDate), InputEventOna.DAY)],
      CachedInputEventRef: { ...sightingEvent },
      simpleDate: startBdikotSimpleDate,
      date: startBdikotDate,
      outputEventType: DayType.CAN_START_CHECK_HEFSEK,
      details: [
        `אפשר להתחיל לבדוק הפסק טהרה`,
      ]
    }

    rtn.push(firstNidaDay);
    rtn.push(...mahzorDays);
    rtn.push(startBdikot);
    if (includeHashashot) {
      if (!suppressOnahBeinonit) {
        rtn.push(this.calculateOnahBeinonit(sightingEvent, approach));
      }
      rtn.push(this.calculateVesetHaChodesh(sightingEvent));
    }

    return rtn;
  }

  /**
   * Derives the current fixed/semi-fixed state from sightings; no state is
   * deleted or persisted. A dormant fixed pattern remains available for the
   * one-occurrence restoration rule until a different fixed pattern is made.
   */
  calculateVesetPatternState(
    events: CachedInputEvent[],
    approach: Approach,
    asOf?: HebrewDateKey,
  ): VesetPatternState {
    const evaluationDate = asOf ?? this.defaultPatternEvaluationDate(events);
    const { pattern } = this.deriveFixedVeset(events, evaluationDate, false);
    const semiFixedSephardi = this.hasSephardiSemiFixedPattern(events, approach, evaluationDate);
    return {
      fixed: pattern,
      semiFixedSephardi,
      suppressesOnahBeinonit: pattern?.status === 'active' || semiFixedSephardi,
    };
  }

  getFixedVesetConcerns(
    events: CachedInputEvent[],
    _approach: Approach,
    asOf?: HebrewDateKey,
  ): OutputEvent[] {
    return this.deriveFixedVeset(
      events,
      asOf ?? this.defaultPatternEvaluationDate(events),
      true,
    ).concerns;
  }

  /**
   * The app permits future test/planning entries. Use the later of today and
   * the latest entered sighting so those entries can establish a pattern;
   * callers that need a historical snapshot still pass an explicit `asOf`.
   */
  private defaultPatternEvaluationDate(events: CachedInputEvent[]): HebrewDateKey {
    const today = hDateToHebrewDateKey(new HDate());
    const sightings = events
      .filter(event => this.createsHashashot(event))
      .sort((a, b) => this.compareInputEvents(a, b));
    const latest = sightings[sightings.length - 1];
    return latest && this.compareHebrewDates(latest.hebrewDate, today) > 0
      ? latest.hebrewDate
      : today;
  }

  private suppressesOnahBeinonitAt(
    sighting: CachedInputEvent,
    allEvents: CachedInputEvent[],
    approach: Approach,
  ): boolean {
    const throughSighting = allEvents.filter(event =>
      this.createsHashashot(event) && this.compareInputEvents(event, sighting) <= 0,
    );
    return this.calculateVesetPatternState(
      throughSighting,
      approach,
      sighting.hebrewDate,
    ).suppressesOnahBeinonit;
  }

  private deriveFixedVeset(
    events: CachedInputEvent[],
    asOf: HebrewDateKey,
    includeConcerns: boolean,
  ): { pattern: FixedVesetPattern | null; concerns: OutputEvent[] } {
    const sightings = events
      .filter(event => this.createsHashashot(event))
      .filter(event => this.compareHebrewDates(event.hebrewDate, asOf) <= 0)
      .sort((a, b) => this.compareInputEvents(a, b));
    let pattern: FixedVesetPattern | null = null;
    let anchor: CachedInputEvent | undefined;
    const concerns: OutputEvent[] = [];

    for (let index = 0; index < sightings.length; index++) {
      const sighting = sightings[index];

      if (pattern) {
        if (pattern.status === 'active') {
          while (this.compareHebrewDates(pattern.nextExpected, sighting.hebrewDate) < 0) {
            if (includeConcerns && anchor) concerns.push(this.fixedVesetConcern(pattern, anchor));
            pattern.nextExpected = this.nextFixedDate(pattern);
          }
          if (this.sightingMatchesPattern(sighting, pattern)) {
            if (includeConcerns && anchor) concerns.push(this.fixedVesetConcern(pattern, anchor));
            pattern.consecutiveMisses = 0;
            pattern.nextExpected = this.nextFixedDate(pattern);
            anchor = sighting;
          } else {
            pattern.consecutiveMisses++;
            // A sighting on the expected Hebrew date but in the other onah is
            // a deviation; move the expectation to the following month.
            if (this.compareHebrewDates(pattern.nextExpected, sighting.hebrewDate) === 0) {
              pattern.nextExpected = this.nextFixedDate(pattern);
            }
            if (pattern.consecutiveMisses === 3) pattern.status = 'dormant';
          }
        } else {
          while (this.compareHebrewDates(pattern.nextExpected, sighting.hebrewDate) < 0) {
            pattern.nextExpected = this.nextFixedDate(pattern);
          }
          if (this.sightingMatchesPattern(sighting, pattern)) {
            pattern.status = 'active';
            pattern.consecutiveMisses = 0;
            pattern.nextExpected = this.nextFixedDate(pattern);
            anchor = sighting;
          }
        }
      }

      if ((!pattern || pattern.status === 'dormant') && index >= 2) {
        const established = this.patternFromThree(
          sightings[index - 2],
          sightings[index - 1],
          sighting,
        );
        if (established) {
          pattern = established;
          anchor = sighting;
        }
      }
    }

    if (pattern) {
      if (pattern.status === 'active') {
        // Months passing without a recorded sighting do not uproot the fixed
        // veset. Advance the display cursor to the current calculation date.
        while (this.compareHebrewDates(pattern.nextExpected, asOf) < 0) {
          if (includeConcerns && anchor) concerns.push(this.fixedVesetConcern(pattern, anchor));
          pattern.nextExpected = this.nextFixedDate(pattern);
        }
        if (pattern.status === 'active' && includeConcerns && anchor) {
          const future = {
            ...pattern,
            nextExpected: { ...pattern.nextExpected },
          };
          // Future dates are concerns, not deviations. Cancellation is driven
          // only by the recorded off-pattern sightings processed above.
          for (let month = 0; month < FIXED_VESET_FUTURE_MONTHS; month++) {
            concerns.push(this.fixedVesetConcern(future, anchor));
            future.nextExpected = this.nextFixedDate(future);
          }
        }
      } else {
        while (this.compareHebrewDates(pattern.nextExpected, asOf) < 0) {
          pattern.nextExpected = this.nextFixedDate(pattern);
        }
      }
    }

    return { pattern, concerns };
  }

  /**
   * Establishment conditions are deliberately explicit: exactly three
   * consecutive hashash-generating sightings, each one Hebrew month apart,
   * all in the same onah, with either the same day number or the same non-zero
   * day-number step for both transitions.
   */
  private patternFromThree(
    first: CachedInputEvent,
    second: CachedInputEvent,
    third: CachedInputEvent,
  ): FixedVesetPattern | null {
    if (first.ona !== second.ona || second.ona !== third.ona) return null;
    if (!this.isFollowingHebrewMonth(first.hebrewDate, second.hebrewDate) ||
        !this.isFollowingHebrewMonth(second.hebrewDate, third.hebrewDate)) return null;

    const firstStep = second.hebrewDate.day - first.hebrewDate.day;
    const secondStep = third.hebrewDate.day - second.hebrewDate.day;
    if (firstStep !== secondStep) return null;

    const kind = firstStep === 0 ? 'monthly-date' : 'dilug';
    const nextExpected = this.nextPatternDate(third.hebrewDate, firstStep);
    if (!nextExpected) return null;
    return {
      kind,
      status: 'active',
      ona: third.ona,
      dayStep: firstStep,
      nextExpected,
      consecutiveMisses: 0,
      establishedByEventId: third.id,
    };
  }

  private hasSephardiSemiFixedPattern(
    events: CachedInputEvent[],
    approach: Approach,
    asOf: HebrewDateKey,
  ): boolean {
    if (approach.name === ApproachName.CHABAD) return false;
    const sightings = events
      .filter(event => this.createsHashashot(event))
      .filter(event => this.compareHebrewDates(event.hebrewDate, asOf) <= 0)
      .sort((a, b) => this.compareInputEvents(a, b));
    // Three sightings establish the semi-fixed state when both intervening
    // cycle lengths are at least 31 elapsed days.
    if (sightings.length < 3) return false;
    const lastThree = sightings.slice(-3);
    return lastThree.slice(1).every((event, index) =>
      hebrewDateKeyToHDate(event.hebrewDate).abs() -
        hebrewDateKeyToHDate(lastThree[index].hebrewDate).abs() >= 31,
    );
  }

  private isFollowingHebrewMonth(a: HebrewDateKey, b: HebrewDateKey): boolean {
    const next = addHebrewMonths({ ...a, day: 1 }, 1);
    return next.year === b.year && next.month === b.month;
  }

  private nextPatternDate(from: HebrewDateKey, dayStep: number): HebrewDateKey | null {
    const month = addHebrewMonths({ ...from, day: 1 }, 1);
    const day = from.day + dayStep;
    const candidate = hebrewDateKeyToHDate({ ...month, day });
    return candidate.getFullYear() === month.year &&
      candidate.getMonth() === month.month &&
      candidate.getDate() === day
      ? { ...month, day }
      : null;
  }

  private nextFixedDate(pattern: FixedVesetPattern): HebrewDateKey {
    return this.nextPatternDate(pattern.nextExpected, pattern.dayStep) ??
      addHebrewMonths(pattern.nextExpected, 1);
  }

  private sightingMatchesPattern(
    sighting: CachedInputEvent,
    pattern: FixedVesetPattern,
  ): boolean {
    return sighting.ona === pattern.ona &&
      this.compareHebrewDates(sighting.hebrewDate, pattern.nextExpected) === 0;
  }

  private fixedVesetConcern(
    pattern: FixedVesetPattern,
    source: CachedInputEvent,
  ): OutputEvent {
    const target = hebrewDateKeyToHDate(pattern.nextExpected);
    const detail = pattern.kind === 'dilug'
      ? `חשש וסת קבוע בדילוג - ${this.onaLabel(pattern.ona)}`
      : `חשש וסת קבוע - ${this.onaLabel(pattern.ona)}`;
    return {
      id: this.concernId(DayType.VESET_KAVUA, source, target),
      sourceEventId: source.id,
      segments: [this.onahRef(pattern.nextExpected, pattern.ona)],
      CachedInputEventRef: { ...source },
      simpleDate: target.greg(),
      date: HDateToNgbDateStruct(target),
      outputEventType: DayType.VESET_KAVUA,
      details: [detail],
    };
  }

  private compareHebrewDates(a: HebrewDateKey, b: HebrewDateKey): number {
    return hebrewDateKeyToHDate(a).abs() - hebrewDateKeyToHDate(b).abs();
  }

  private getHaflagaHashashot(events: CachedInputEvent[], approach: Approach): OutputEvent[] {
    return approach.name === ApproachName.CHABAD
      ? this.getChabadHaflagaHashashot(events)
      : this.getSephardiHaflagaHashashot(events);
  }

  private getChabadHaflagaHashashot(events: CachedInputEvent[]): OutputEvent[] {
    const activeIntervals: number[] = [];
    let pendingHefsek: CachedInputEvent | undefined;
    let hasSightingBeforeHefsek = false;
    let latestSighting: CachedInputEvent | undefined;

    for (const event of events) {
      if (event.type === InputEventType.HEFSEK_TAHARA) {
        pendingHefsek = hasSightingBeforeHefsek ? event : undefined;
        continue;
      }

      if (!this.createsHashashot(event)) continue;

      hasSightingBeforeHefsek = true;
      latestSighting = event;
      if (!pendingHefsek) continue;

      const interval = this.chabadHaflagaIntervalOnot(pendingHefsek, event);
      for (let i = activeIntervals.length - 1; i >= 0; i--) {
        if (activeIntervals[i] < interval) activeIntervals.splice(i, 1);
      }
      if (!activeIntervals.includes(interval)) activeIntervals.push(interval);
      pendingHefsek = undefined;
    }

    const anchor = pendingHefsek ?? latestSighting;
    if (!anchor || !activeIntervals.length) return [];

    return activeIntervals.map(interval =>
      this.haflagaEventFromHefsekOnot(anchor, interval),
    );
  }

  private getSephardiHaflagaHashashot(events: CachedInputEvent[]): OutputEvent[] {
    const sightings = events.filter(e => this.createsHashashot(e));
    if (sightings.length < 2) return [];

    const previous = sightings[sightings.length - 2];
    const current = sightings[sightings.length - 1];
    const diffDays = this.daysSince(previous, this.startOfDayMs(current.simpleDate));
    const intervalDays = diffDays + 1;
    const targetSimpleDate = this.addDays(current.simpleDate, diffDays);

    return [
      this.haflagaEvent(
        current,
        targetSimpleDate,
        current.ona,
        `חשש וסת הפלגה - ${this.onaLabel(current.ona)} (${intervalDays} ימים)`,
      ),
    ];
  }

  private chabadHaflagaIntervalOnot(hefsek: CachedInputEvent, sighting: CachedInputEvent): number {
    const diffDays = this.daysSince(hefsek, this.startOfDayMs(sighting.simpleDate));
    return diffDays * 2 + (sighting.ona === InputEventOna.LAYLA ? 1 : 0);
  }

  private haflagaEventFromHefsekOnot(hefsek: CachedInputEvent, interval: number): OutputEvent {
    const ona = interval % 2 === 0 ? InputEventOna.YOM : InputEventOna.LAYLA;
    const offsetDays = ona === InputEventOna.YOM ? interval / 2 : (interval - 1) / 2;
    const targetSimpleDate = this.addDays(hefsek.simpleDate, offsetDays);
    return this.haflagaEvent(
      hefsek,
      targetSimpleDate,
      ona,
      `חשש וסת הפלגה - ${this.onaLabel(ona)} (${interval} עונות)`,
    );
  }

  private haflagaEvent(
    ref: CachedInputEvent,
    simpleDate: Date,
    ona: InputEventOna,
    detail: string,
  ): OutputEvent {
    const hdate = simpleDateToHebrew(simpleDate);
    return {
      id: this.concernId(
        ona === InputEventOna.NIGHT ? DayType.HAFLAGA_NIGHT : DayType.HAFLAGA_DAY,
        ref,
        hdate,
      ),
      sourceEventId: ref.id,
      segments: [this.onahRef(hDateToHebrewDateKey(hdate), ona)],
      CachedInputEventRef: { ...ref },
      simpleDate,
      date: HDateToNgbDateStruct(hdate),
      outputEventType: ona === InputEventOna.LAYLA ? DayType.HAFLAGA_NIGHT : DayType.HAFLAGA_DAY,
      details: [detail],
    };
  }

  private createsHashashot(event: CachedInputEvent): boolean {
    return event.type === InputEventType.VESET ||
      event.type === InputEventType.BDIKA_TMEA;
  }

  private onaLabel(ona: InputEventOna): string {
    return ona === InputEventOna.LAYLA ? 'לילה' : 'יום';
  }

  private addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
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

  private calculateOnahBeinonit(
    sightingEvent: CachedInputEvent,
    approach: Approach,
  ): OutputEvent {
    const targetDate = addHebrewDays(sightingEvent.hebrewDate, 29);
    const targetHDate = hebrewDateKeyToHDate(targetDate);
    const isChabad = approach.name === ApproachName.CHABAD;
    const onaLabel = this.onaLabel(sightingEvent.ona);
    return {
      id: this.concernId(DayType.ONA_BEINONIT, sightingEvent, targetHDate),
      sourceEventId: sightingEvent.id,
      segments: isChabad
        ? this.fullHebrewDateSegments(targetDate)
        : [this.onahRef(targetDate, sightingEvent.ona)],
      CachedInputEventRef: { ...sightingEvent },
      simpleDate: targetHDate.greg(),
      date: HDateToNgbDateStruct(targetHDate),
      outputEventType: DayType.ONA_BEINONIT,
      details: [isChabad ? 'חשש עונה בינונית' : `חשש עונה בינונית - ${onaLabel}`],
    };
  }

  private calculateVesetHaChodesh(sightingEvent: CachedInputEvent): OutputEvent {
    const targetDate = sameHebrewDayInNextMonth(sightingEvent.hebrewDate);
    const targetHDate = hebrewDateKeyToHDate(targetDate);
    const outputEventType = sightingEvent.ona === InputEventOna.NIGHT
      ? DayType.VESET_HACHODESH_NIGHT
      : DayType.VESET_HACHODESH_DAY;
    return {
      id: this.concernId(outputEventType, sightingEvent, targetHDate),
      sourceEventId: sightingEvent.id,
      segments: [this.onahRef(targetDate, sightingEvent.ona)],
      CachedInputEventRef: { ...sightingEvent },
      simpleDate: targetHDate.greg(),
      date: HDateToNgbDateStruct(targetHDate),
      outputEventType,
      details: [`חשש וסת החודש - ${this.onaLabel(sightingEvent.ona)}`],
    };
  }

  private fullHebrewDateSegments(hebrewDate: HebrewDateKey): OnahRef[] {
    return [
      this.onahRef(hebrewDate, InputEventOna.NIGHT),
      this.onahRef(hebrewDate, InputEventOna.DAY),
    ];
  }

  private onahRef(hebrewDate: HebrewDateKey, onah: InputEventOna): OnahRef {
    return { hebrewDate: { ...hebrewDate }, onah };
  }

  private concernId(
    type: DayType | InputEventType,
    source: CachedInputEvent,
    date: ReturnType<typeof simpleDateToHebrew>,
  ): string {
    return `${type}:${source.id}:${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }

  private compareInputEvents(a: CachedInputEvent, b: CachedInputEvent): number {
    const dateDiff = hebrewDateKeyToHDate(a.hebrewDate).abs() -
      hebrewDateKeyToHDate(b.hebrewDate).abs();
    if (dateDiff !== 0) return dateDiff;

    const onahOrder = (onah: InputEventOna) =>
      onah === InputEventOna.NIGHT ? 0 : 1;
    return onahOrder(a.ona) - onahOrder(b.ona);
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
