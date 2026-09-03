import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { HDate, months } from '@hebcal/core';

import { CalService } from './cal.service';
import { CacheService } from './cache.service';
import { ApproachService } from './approach.service';
import { Approach, ApproachName } from '../interfaces/approaches';
import {
  CachedInputEvent,
  CalEventDict,
  DayType,
  InputEventOna,
  InputEventType,
  OutputEvent,
} from '../interfaces/cal';
import { addHebrewDays, addHebrewMonths, HDateToNgbDateStruct, hDateToHebrewDateKey, hebrewDateKeyToHDate, NgbDateStructToHDate, sameHebrewDayInNextMonth, simpleDateToHebrew } from '../utils/date.util';

// -----------------------------------------------------------------------------
// Test helpers
// -----------------------------------------------------------------------------

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const APPROACH_CHABAD: Approach = {
  name: ApproachName.CHABAD,
  nameHeb: 'חב"ד',
  svg: '',
};
const APPROACH_SEPHARDI_MORDECHAI_ELIYAHU: Approach = {
  name: ApproachName.SEPHARDI_MORDECHAI_ELIYAHU,
  nameHeb: 'ספרדי - הרב מרדכי אליהו',
  svg: '',
};
const APPROACH_SEPHARDI_OVADIA: Approach = {
  name: ApproachName.SEPHARDI_OVADIA,
  nameHeb: 'ספרדי - הרב עובדיה',
  svg: '',
};

/**
 * Build a CachedInputEvent. Uses a UTC-noon Date so DST shifts in any timezone
 * never push the day boundary by one.
 */
function makeEvent(
  isoDate: string,
  type: InputEventType,
  ona: InputEventOna = InputEventOna.YOM,
): CachedInputEvent {
  // 12:00:00 UTC – far from any sunset / DST change.
  const simpleDate = new Date(`${isoDate}T12:00:00Z`);
  const hdate = new HDate(simpleDate);
  return {
    id: `${type}:${isoDate}:${ona}`,
    hebrewDate: hDateToHebrewDateKey(hdate),
    simpleDate,
    date: HDateToNgbDateStruct(hdate),
    type,
    ona,
  };
}

function makeHebrewEvent(
  hdate: HDate,
  type: InputEventType,
  ona: InputEventOna = InputEventOna.DAY,
): CachedInputEvent {
  const simpleDate = hdate.greg();
  return {
    id: `${type}:${hdate.toString()}:${ona}`,
    hebrewDate: hDateToHebrewDateKey(hdate),
    simpleDate,
    date: HDateToNgbDateStruct(hdate),
    type,
    ona,
  };
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function dayDiff(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY);
}

/** A controllable in-memory CacheService double. */
class CacheServiceStub {
  private readonly _events$ = new BehaviorSubject<CachedInputEvent[]>([]);
  inputEvents$ = this._events$.asObservable();

  setEvents(events: CachedInputEvent[]) {
    this._events$.next([...events]);
  }
  setInputEvents(event: CachedInputEvent) {
    this._events$.next([...this._events$.getValue(), { ...event }]);
  }
  getInputEvents(): CachedInputEvent[] {
    return this._events$.getValue();
  }
  removeInputEvent(event: CachedInputEvent) {
    const remaining = this._events$.getValue().filter(e => e.id !== event.id);
    this._events$.next(remaining);
  }
  // unused fields but referenced via type
  calEvents$ = new BehaviorSubject([]).asObservable();
}

class ApproachServiceStub {
  approach$ = new BehaviorSubject<Approach>(APPROACH_CHABAD);
}

// -----------------------------------------------------------------------------
// Suite
// -----------------------------------------------------------------------------

describe('CalService – hashashot / hefsek tahara / 7 nekiim', () => {
  let cal: CalService;
  let cache: CacheServiceStub;
  let approach: ApproachServiceStub;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CalService,
        { provide: CacheService, useClass: CacheServiceStub },
        { provide: ApproachService, useClass: ApproachServiceStub },
      ],
    });
    cache = TestBed.inject(CacheService) as unknown as CacheServiceStub;
    approach = TestBed.inject(ApproachService) as unknown as ApproachServiceStub;
    cal = TestBed.inject(CalService);
  });

  // ---------------------------------------------------------------------------
  // getSevenCleanDays
  // ---------------------------------------------------------------------------
  describe('getSevenCleanDays()', () => {
    it('returns 7 nekiim days + 1 mikveh marker on day 8 (8 events total)', () => {
      const hefsek = makeEvent('2025-01-10', InputEventType.HEFSEK_TAHARA);
      const events = cal.getSevenCleanDays(hefsek, [hefsek], APPROACH_CHABAD);

      const nekiim = events.filter(e => e.outputEventType === DayType.SEVEN_CLEAN);
      const mikveh = events.filter(e => e.outputEventType === DayType.MIKVEH_DAY);

      expect(nekiim.length).toBe(7);
      expect(mikveh.length).toBe(1);
      expect(events.length).toBe(8);
    });

    it('the 7 nekiim days are tagged SEVEN_CLEAN (not MAHZOR)', () => {
      const hefsek = makeEvent('2025-01-10', InputEventType.HEFSEK_TAHARA);
      const nekiim = cal.getSevenCleanDays(hefsek, [hefsek], APPROACH_CHABAD)
        .filter(e => e.outputEventType === DayType.SEVEN_CLEAN);
      for (const d of nekiim) {
        expect(d.outputEventType).toBe(DayType.SEVEN_CLEAN);
      }
    });

    it('nekiim days fall on hefsek+1 .. hefsek+7', () => {
      const hefsek = makeEvent('2025-01-10', InputEventType.HEFSEK_TAHARA);
      const nekiim = cal.getSevenCleanDays(hefsek, [hefsek], APPROACH_CHABAD)
        .filter(e => e.outputEventType === DayType.SEVEN_CLEAN);
      nekiim.forEach((d, i) => {
        expect(dayDiff(hefsek.simpleDate, d.simpleDate)).toBe(i + 1);
        expect(d.details).toEqual([`יום ${i + 1}/7 נקיים`]);
      });
    });

    it('mikveh marker falls after all 7 full nekiim days, on hefsek+8', () => {
      const hefsek = makeEvent('2025-01-10', InputEventType.HEFSEK_TAHARA);
      const events = cal.getSevenCleanDays(hefsek, [hefsek], APPROACH_CHABAD);

      const nekiim7 = events.filter(e => e.outputEventType === DayType.SEVEN_CLEAN)[6];
      const mikveh = events.find(e => e.outputEventType === DayType.MIKVEH_DAY)!;

      expect(dayDiff(nekiim7.simpleDate, mikveh.simpleDate)).toBe(1);
      expect(dayDiff(hefsek.simpleDate, mikveh.simpleDate)).toBe(8);
    });

    it('mikveh marker occupies only the night on day 8', () => {
      const hefsek = makeEvent('2025-01-10', InputEventType.HEFSEK_TAHARA);
      const mikveh = cal.getSevenCleanDays(hefsek, [hefsek], APPROACH_CHABAD)
        .find(e => e.outputEventType === DayType.MIKVEH_DAY)!;

      expect(mikveh.segments).toEqual([{
        hebrewDate: hDateToHebrewDateKey(simpleDateToHebrew(mikveh.simpleDate)),
        onah: InputEventOna.NIGHT,
      }]);
    });

    it('mikveh marker has the evening-tvila label', () => {
      const hefsek = makeEvent('2025-01-10', InputEventType.HEFSEK_TAHARA);
      const mikveh = cal.getSevenCleanDays(hefsek, [hefsek], APPROACH_CHABAD)
        .find(e => e.outputEventType === DayType.MIKVEH_DAY)!;
      expect(mikveh.details).toEqual(['בערב טבילה במקווה']);
    });

    it('mikveh marker is NOT one of the seven nekiim (no "נקיים" in details)', () => {
      const hefsek = makeEvent('2025-01-10', InputEventType.HEFSEK_TAHARA);
      const mikveh = cal.getSevenCleanDays(hefsek, [hefsek], APPROACH_CHABAD)
        .find(e => e.outputEventType === DayType.MIKVEH_DAY)!;
      expect(mikveh.details.some(d => /נקיים/.test(d))).toBe(false);
    });

    it('every emitted event references the Hefsek Tahara that produced it', () => {
      const hefsek = makeEvent('2025-01-10', InputEventType.HEFSEK_TAHARA);
      const events = cal.getSevenCleanDays(hefsek, [hefsek], APPROACH_CHABAD);
      for (const d of events) {
        expect(d.CachedInputEventRef.type).toBe(InputEventType.HEFSEK_TAHARA);
        expect(d.CachedInputEventRef.simpleDate.getTime())
          .toBe(hefsek.simpleDate.getTime());
      }
    });
  });

  // ---------------------------------------------------------------------------
  // getNidaDaysHashashotForVeset – single Veset (chainLast === veset)
  // ---------------------------------------------------------------------------
  describe('getNidaDaysHashashotForVeset() – single veset, no chain', () => {
    it('Chabad: 5 niddah days, CAN_START_CHECK_HEFSEK on day 5', () => {
      const veset = makeEvent('2025-01-10', InputEventType.VESET);
      const out = cal.getNidaDaysHashashotForVeset(veset, veset, APPROACH_CHABAD);

      const day1 = out.find(e => e.outputEventType === InputEventType.VESET)!;
      expect(day1).toBeTruthy();
      expect(day1.details).toEqual(['ווסת – יום 1 לנידה']);
      expect(dayDiff(veset.simpleDate, day1.simpleDate)).toBe(0);

      const mahzor = out.filter(e => e.outputEventType === DayType.MAHZOR);
      expect(mahzor.length).toBe(4); // days 2..5
      mahzor.forEach((d, i) => {
        expect(dayDiff(veset.simpleDate, d.simpleDate)).toBe(i + 1);
        expect(d.details).toEqual([`יום ${i + 2} לנידה`]);
      });

      const startBdikot = out.find(
        e => e.outputEventType === DayType.CAN_START_CHECK_HEFSEK,
      )!;
      expect(startBdikot).toBeTruthy();
      expect(dayDiff(veset.simpleDate, startBdikot.simpleDate)).toBe(4); // veset + (forNum-1)
    });

    it('Rav Mordechai Eliyahu: 5 niddah days, CAN_START_CHECK_HEFSEK on day 5', () => {
      const veset = makeEvent('2025-01-10', InputEventType.VESET);
      const out = cal.getNidaDaysHashashotForVeset(veset, veset, APPROACH_SEPHARDI_MORDECHAI_ELIYAHU);

      const mahzor = out.filter(e => e.outputEventType === DayType.MAHZOR);
      expect(mahzor.length).toBe(4); // days 2..5

      const startBdikot = out.find(
        e => e.outputEventType === DayType.CAN_START_CHECK_HEFSEK,
      )!;
      expect(dayDiff(veset.simpleDate, startBdikot.simpleDate)).toBe(4);
    });

    it('Rav Ovadia: 4 niddah days, CAN_START_CHECK_HEFSEK on day 4', () => {
      const veset = makeEvent('2025-01-10', InputEventType.VESET);
      const out = cal.getNidaDaysHashashotForVeset(veset, veset, APPROACH_SEPHARDI_OVADIA);

      const mahzor = out.filter(e => e.outputEventType === DayType.MAHZOR);
      expect(mahzor.length).toBe(3); // days 2..4

      const startBdikot = out.find(
        e => e.outputEventType === DayType.CAN_START_CHECK_HEFSEK,
      )!;
      expect(dayDiff(veset.simpleDate, startBdikot.simpleDate)).toBe(3);
    });

    it('Chabad: Ona Beinonit is Hebrew day +29 and explicitly occupies Night and Day', () => {
      const veset = makeEvent('2025-01-10', InputEventType.VESET, InputEventOna.LAYLA);
      const out = cal.getNidaDaysHashashotForVeset(veset, veset, APPROACH_CHABAD);

      const onaBeinonit = out.find(e => e.outputEventType === DayType.ONA_BEINONIT)!;
      expect(onaBeinonit).toBeTruthy();
      const targetDate = addHebrewDays(veset.hebrewDate, 29);
      expect(onaBeinonit.segments).toEqual([
        { hebrewDate: targetDate, onah: InputEventOna.NIGHT },
        { hebrewDate: targetDate, onah: InputEventOna.DAY },
      ]);
      expect(onaBeinonit.details).toContain('חשש עונה בינונית');
    });

    it('Chabad: full-day Onah Beinonit does not depend on the original onah', () => {
      const night = makeEvent('2025-01-10', InputEventType.VESET, InputEventOna.NIGHT);
      const day = makeEvent('2025-01-10', InputEventType.VESET, InputEventOna.DAY);

      const nightConcern = cal.getNidaDaysHashashotForVeset(night, night, APPROACH_CHABAD)
        .find(e => e.outputEventType === DayType.ONA_BEINONIT)!;
      const dayConcern = cal.getNidaDaysHashashotForVeset(day, day, APPROACH_CHABAD)
        .find(e => e.outputEventType === DayType.ONA_BEINONIT)!;

      expect(nightConcern.segments).toEqual(dayConcern.segments);
    });

    it('Rav Ovadia: Ona Beinonit is Hebrew day +29 on the original Night onah', () => {
      const veset = makeEvent('2025-01-10', InputEventType.VESET, InputEventOna.LAYLA);
      const out = cal.getNidaDaysHashashotForVeset(veset, veset, APPROACH_SEPHARDI_OVADIA);

      const onaBeinonit = out.find(e => e.outputEventType === DayType.ONA_BEINONIT)!;
      expect(onaBeinonit).toBeTruthy();
      expect(onaBeinonit.segments).toEqual([
        { hebrewDate: addHebrewDays(veset.hebrewDate, 29), onah: InputEventOna.NIGHT },
      ]);
      expect(onaBeinonit.details).toContain('חשש עונה בינונית - לילה');
    });

    it('Rav Ovadia: a Day sighting produces only the target Day segment', () => {
      const veset = makeEvent('2025-01-10', InputEventType.VESET, InputEventOna.DAY);
      const onaBeinonit = cal.getNidaDaysHashashotForVeset(veset, veset, APPROACH_SEPHARDI_OVADIA)
        .find(e => e.outputEventType === DayType.ONA_BEINONIT)!;

      expect(onaBeinonit.segments).toEqual([
        { hebrewDate: addHebrewDays(veset.hebrewDate, 29), onah: InputEventOna.DAY },
      ]);
    });

    it('Rav Mordechai Eliyahu: Ona Beinonit is Hebrew day +29 on the original Day onah', () => {
      const veset = makeEvent('2025-01-10', InputEventType.VESET, InputEventOna.YOM);
      const out = cal.getNidaDaysHashashotForVeset(veset, veset, APPROACH_SEPHARDI_MORDECHAI_ELIYAHU);

      const onaBeinonit = out.find(e => e.outputEventType === DayType.ONA_BEINONIT)!;
      expect(onaBeinonit).toBeTruthy();
      expect(onaBeinonit.segments).toEqual([
        { hebrewDate: addHebrewDays(veset.hebrewDate, 29), onah: InputEventOna.DAY },
      ]);
      expect(onaBeinonit.details).toContain('חשש עונה בינונית - יום');
    });

    it('Rav Mordechai Eliyahu: a Night sighting produces only the target Night segment', () => {
      const veset = makeEvent('2025-01-10', InputEventType.VESET, InputEventOna.NIGHT);
      const onaBeinonit = cal.getNidaDaysHashashotForVeset(
        veset,
        veset,
        APPROACH_SEPHARDI_MORDECHAI_ELIYAHU,
      ).find(e => e.outputEventType === DayType.ONA_BEINONIT)!;

      expect(onaBeinonit.segments).toEqual([
        { hebrewDate: addHebrewDays(veset.hebrewDate, 29), onah: InputEventOna.NIGHT },
      ]);
    });

    it('keeps Onah Beinonit and Veset HaChodesh independent after a 29-day source month', () => {
      const veset = makeHebrewEvent(
        new HDate(1, months.IYYAR, 5786),
        InputEventType.VESET,
        InputEventOna.NIGHT,
      );
      const out = cal.getNidaDaysHashashotForVeset(veset, veset, APPROACH_SEPHARDI_OVADIA);
      const beinonit = out.find(e => e.outputEventType === DayType.ONA_BEINONIT)!;
      const hachodesh = out.find(e =>
        e.outputEventType === DayType.VESET_HACHODESH_NIGHT ||
        e.outputEventType === DayType.VESET_HACHODESH_DAY,
      )!;

      expect(beinonit.segments[0].hebrewDate).toEqual({
        year: 5786,
        month: months.SIVAN,
        day: 1,
      });
      expect(hachodesh.segments[0].hebrewDate).toEqual(beinonit.segments[0].hebrewDate);
      expect(hachodesh.id).not.toBe(beinonit.id);
    });

    it('places Onah Beinonit one Hebrew day before Veset HaChodesh after a 30-day source month', () => {
      const veset = makeHebrewEvent(
        new HDate(1, months.NISAN, 5786),
        InputEventType.VESET,
        InputEventOna.DAY,
      );
      const out = cal.getNidaDaysHashashotForVeset(veset, veset, APPROACH_SEPHARDI_OVADIA);
      const beinonit = out.find(e => e.outputEventType === DayType.ONA_BEINONIT)!;
      const hachodesh = out.find(e =>
        e.outputEventType === DayType.VESET_HACHODESH_NIGHT ||
        e.outputEventType === DayType.VESET_HACHODESH_DAY,
      )!;

      expect(beinonit.segments[0].hebrewDate).toEqual({
        year: 5786,
        month: months.NISAN,
        day: 30,
      });
      expect(hachodesh.segments[0].hebrewDate).toEqual({
        year: 5786,
        month: months.IYYAR,
        day: 1,
      });
      const beinonitAbs = new HDate(30, months.NISAN, 5786).abs();
      const hachodeshAbs = new HDate(1, months.IYYAR, 5786).abs();
      expect(hachodeshAbs - beinonitAbs).toBe(1);
    });

    it('calculates 15 Nisan independently as 14 Iyar and 15 Iyar', () => {
      const veset = makeHebrewEvent(
        new HDate(15, months.NISAN, 5786),
        InputEventType.VESET,
        InputEventOna.DAY,
      );
      const out = cal.getNidaDaysHashashotForVeset(veset, veset, APPROACH_SEPHARDI_OVADIA);
      const beinonit = out.find(e => e.outputEventType === DayType.ONA_BEINONIT)!;
      const hachodesh = out.find(e => e.outputEventType === DayType.VESET_HACHODESH_DAY)!;

      expect(beinonit.segments[0].hebrewDate).toEqual({ year: 5786, month: months.IYYAR, day: 14 });
      expect(hachodesh.segments[0].hebrewDate).toEqual({ year: 5786, month: months.IYYAR, day: 15 });
    });

    it('Veset HaChodesh hashash is the same Hebrew day, next Hebrew month', () => {
      const veset = makeEvent('2025-01-10', InputEventType.VESET);
      const out = cal.getNidaDaysHashashotForVeset(veset, veset, APPROACH_CHABAD);

      const vesetHachodesh = out.find(
        e =>
          e.outputEventType === DayType.VESET_HACHODESH_DAY ||
          e.outputEventType === DayType.VESET_HACHODESH_NIGHT,
      )!;
      expect(vesetHachodesh).toBeTruthy();

      const expectedDate = sameHebrewDayInNextMonth(veset.hebrewDate);

      expect(vesetHachodesh.segments).toEqual([
        { hebrewDate: expectedDate, onah: veset.ona },
      ]);
    });

    it('VESET_HACHODESH type is DAY when ona is yom', () => {
      const veset = makeEvent(
        '2025-01-10',
        InputEventType.VESET,
        InputEventOna.YOM,
      );
      const out = cal.getNidaDaysHashashotForVeset(veset, veset, APPROACH_CHABAD);
      expect(out.some(e => e.outputEventType === DayType.VESET_HACHODESH_DAY))
        .toBe(true);
      expect(out.some(e => e.outputEventType === DayType.VESET_HACHODESH_NIGHT))
        .toBe(false);
    });

    it('VESET_HACHODESH type is NIGHT when ona is layla', () => {
      const veset = makeEvent(
        '2025-01-10',
        InputEventType.VESET,
        InputEventOna.LAYLA,
      );
      const out = cal.getNidaDaysHashashotForVeset(veset, veset, APPROACH_CHABAD);
      expect(out.some(e => e.outputEventType === DayType.VESET_HACHODESH_NIGHT))
        .toBe(true);
      expect(out.some(e => e.outputEventType === DayType.VESET_HACHODESH_DAY))
        .toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Chain extension (Veset + later Veset / KetemTame within niddah window)
  // ---------------------------------------------------------------------------
  describe('Chain extension via highlightedInputEvents$', () => {
    it('absorbs a second VESET that falls inside the niddah window (Chabad, 5d)', async () => {
      const v1 = makeEvent('2025-01-10', InputEventType.VESET);
      const v2 = makeEvent('2025-01-13', InputEventType.VESET); // +3 days, inside 5-day window
      cache.setEvents([v1, v2]);

      const dict = await firstValueFrom(cal.highlightedInputEvents$);
      const all: OutputEvent[] = flatten(dict);

      // Only ONE day-1 marker should exist (the second VESET is absorbed and
      // does not get its own niddah chain).
      const day1Markers = all.filter(e => e.outputEventType === InputEventType.VESET);
      expect(day1Markers.length).toBe(1);
      expect(dayDiff(v1.simpleDate, day1Markers[0].simpleDate)).toBe(0);

      // niddah days = (chainLast - veset)/day + forNum = 3 + 5 = 8
      const mahzor = all.filter(e => e.outputEventType === DayType.MAHZOR);
      expect(mahzor.length).toBe(7); // days 2..8

      // CAN_START_CHECK_HEFSEK is on chainLast + (forNum - 1) = v1 + 3 + 4 = v1 + 7
      const start = all.find(
        e => e.outputEventType === DayType.CAN_START_CHECK_HEFSEK,
      )!;
      expect(dayDiff(v1.simpleDate, start.simpleDate)).toBe(7);
    });

    it('does NOT absorb a VESET that falls outside the niddah window', async () => {
      const v1 = makeEvent('2025-01-10', InputEventType.VESET);
      // 6 days later — outside the 5-day window (window covers v1..v1+4 = day1..day5).
      const v2 = makeEvent('2025-01-16', InputEventType.VESET);
      cache.setEvents([v1, v2]);

      const all = flatten(await firstValueFrom(cal.highlightedInputEvents$));

      // Two independent niddah chains → two day-1 markers.
      const day1Markers = all.filter(e => e.outputEventType === InputEventType.VESET);
      expect(day1Markers.length).toBe(2);
    });

    it('absorbs a KETEM_TAME inside the niddah window', async () => {
      const v1 = makeEvent('2025-01-10', InputEventType.VESET);
      const k = makeEvent('2025-01-12', InputEventType.KETEM_TAME);
      cache.setEvents([v1, k]);

      const all = flatten(await firstValueFrom(cal.highlightedInputEvents$));
      const day1Markers = all.filter(e => e.outputEventType === InputEventType.VESET);
      expect(day1Markers.length).toBe(1);

      // niddah extends to k + 4 = v1 + 6
      const start = all.find(
        e => e.outputEventType === DayType.CAN_START_CHECK_HEFSEK,
      )!;
      expect(dayDiff(v1.simpleDate, start.simpleDate)).toBe(6);
    });
  });

  // ---------------------------------------------------------------------------
  // highlightedInputEvents$ – standalone Ketem / Bdika sightings
  // ---------------------------------------------------------------------------
  describe('highlightedInputEvents$ – standalone Ketem / Bdika sightings', () => {
    it('keeps an Elul sighting and its waiting days on valid visible Hebrew dates', async () => {
      approach.approach$.next(APPROACH_SEPHARDI_OVADIA);
      const bdika = makeEvent('2026-08-16', InputEventType.BDIKA_TMEA);
      // Simulate an entry persisted before the Elul month-conversion fix.
      bdika.date.month = 0;
      cache.setEvents([bdika]);

      const all = flatten(await firstValueFrom(cal.highlightedInputEvents$));
      const nidaWindow = all.filter(event =>
        event.outputEventType === InputEventType.BDIKA_TMEA ||
        event.outputEventType === DayType.MAHZOR,
      );

      expect(nidaWindow.length).toBe(4);
      expect(nidaWindow[0].date).toEqual({ day: 3, month: 12, year: 5786 });
      expect(nidaWindow.every(event => event.date.month >= 1 && event.date.month <= 12)).toBe(true);
      nidaWindow.forEach(event => {
        expect(NgbDateStructToHDate(event.date).greg().getTime())
          .toBe(new Date(event.simpleDate).setHours(0, 0, 0, 0));
      });
    });

    it('Ketem Tame opens a 4-day niddah window for Rav Ovadia without a leniency message or hashashot', async () => {
      approach.approach$.next(APPROACH_SEPHARDI_OVADIA);
      const ketem = makeEvent('2025-01-10', InputEventType.KETEM_TAME);
      cache.setEvents([ketem]);

      const all = flatten(await firstValueFrom(cal.highlightedInputEvents$));

      const day1 = all.find(e => e.outputEventType === InputEventType.KETEM_TAME)!;
      expect(day1).toBeTruthy();
      expect(day1.details).toEqual(['כתם טמא – יום 1 לנידה']);
      expect(dayDiff(ketem.simpleDate, day1.simpleDate)).toBe(0);

      const mahzor = all.filter(e => e.outputEventType === DayType.MAHZOR);
      expect(mahzor.length).toBe(3); // days 2..4
      expect(mahzor.every(e => e.details.length === 1)).toBe(true);

      const start = all.find(e => e.outputEventType === DayType.CAN_START_CHECK_HEFSEK)!;
      expect(dayDiff(ketem.simpleDate, start.simpleDate)).toBe(3);
      expect(start.details).toEqual(['אפשר להתחיל לבדוק הפסק טהרה']);

      expect(all.some(e => e.outputEventType === DayType.ONA_BEINONIT)).toBe(false);
      expect(all.some(e =>
        e.outputEventType === DayType.VESET_HACHODESH_DAY ||
        e.outputEventType === DayType.VESET_HACHODESH_NIGHT,
      )).toBe(false);
    });

    it('Bdika Tmea opens a 4-day niddah window for Rav Ovadia with hashashot', async () => {
      approach.approach$.next(APPROACH_SEPHARDI_OVADIA);
      const bdika = makeEvent('2025-01-10', InputEventType.BDIKA_TMEA, InputEventOna.LAYLA);
      cache.setEvents([bdika]);

      const all = flatten(await firstValueFrom(cal.highlightedInputEvents$));

      const day1 = all.find(e => e.outputEventType === InputEventType.BDIKA_TMEA)!;
      expect(day1).toBeTruthy();
      expect(day1.details).toEqual(['בדיקה טמאה – יום 1 לנידה']);
      expect(all.some(e => e.details.some(d => /דעה מקילה בכתם/.test(d)))).toBe(false);

      const mahzor = all.filter(e => e.outputEventType === DayType.MAHZOR);
      expect(mahzor.length).toBe(3); // days 2..4

      const start = all.find(e => e.outputEventType === DayType.CAN_START_CHECK_HEFSEK)!;
      expect(dayDiff(bdika.simpleDate, start.simpleDate)).toBe(3);

      const onaBeinonit = all.find(e => e.outputEventType === DayType.ONA_BEINONIT)!;
      expect(onaBeinonit).toBeTruthy();
      expect(onaBeinonit.segments).toEqual([
        { hebrewDate: addHebrewDays(bdika.hebrewDate, 29), onah: InputEventOna.NIGHT },
      ]);
      expect(all.some(e => e.outputEventType === DayType.VESET_HACHODESH_NIGHT)).toBe(true);
    });

    it('Bdika Tmea opens a 5-day niddah window for Chabad', async () => {
      const bdika = makeEvent('2025-01-10', InputEventType.BDIKA_TMEA);
      cache.setEvents([bdika]);

      const all = flatten(await firstValueFrom(cal.highlightedInputEvents$));
      expect(all.filter(e => e.outputEventType === DayType.MAHZOR).length).toBe(4);

      const start = all.find(e => e.outputEventType === DayType.CAN_START_CHECK_HEFSEK)!;
      expect(dayDiff(bdika.simpleDate, start.simpleDate)).toBe(4);
    });
  });

  // ---------------------------------------------------------------------------
  // highlightedInputEvents$ – Hefsek Tahara → 7 nekiim
  // ---------------------------------------------------------------------------
  describe('highlightedInputEvents$ – Hefsek Tahara produces 7 nekiim', () => {
    it('emits 7 derived nekiim days following the Hefsek Tahara', async () => {
      const v = makeEvent('2025-01-10', InputEventType.VESET);
      // Day 5 (Chabad): earliest legal hefsek
      const hefsek = makeEvent('2025-01-14', InputEventType.HEFSEK_TAHARA);
      cache.setEvents([v, hefsek]);

      const all = flatten(await firstValueFrom(cal.highlightedInputEvents$));

      const nekiim = all.filter(
        e =>
          e.CachedInputEventRef.type === InputEventType.HEFSEK_TAHARA &&
          e.details.some(d => /נקיים/.test(d)),
      );
      expect(nekiim.length).toBe(7);
      nekiim.forEach((d, i) => {
        expect(dayDiff(hefsek.simpleDate, d.simpleDate)).toBe(i + 1);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Veset Haflaga
  // ---------------------------------------------------------------------------
  describe('Veset Haflaga', () => {
    it('Sephardi: counts inclusive days from sighting start to sighting start and marks the latest ona', async () => {
      approach.approach$.next(APPROACH_SEPHARDI_OVADIA);
      const v1 = makeEvent('2025-01-10', InputEventType.VESET, InputEventOna.YOM);
      const v2 = makeEvent('2025-01-20', InputEventType.VESET, InputEventOna.LAYLA);
      cache.setEvents([v1, v2]);

      const all = flatten(await firstValueFrom(cal.highlightedInputEvents$));
      const haflaga = all.find(e => e.outputEventType === DayType.HAFLAGA_NIGHT)!;

      expect(haflaga).toBeTruthy();
      expect(dayDiff(v2.simpleDate, haflaga.simpleDate)).toBe(10);
      expect(haflaga.segments[0].onah).toBe(InputEventOna.NIGHT);
      expect(haflaga.details).toContain('חשש וסת הפלגה - לילה (11 ימים)');
    });

    it('Sephardi: uses only the latest two hashash-generating sightings', async () => {
      approach.approach$.next(APPROACH_SEPHARDI_MORDECHAI_ELIYAHU);
      const v1 = makeEvent('2025-01-01', InputEventType.VESET);
      const v2 = makeEvent('2025-01-10', InputEventType.VESET);
      const v3 = makeEvent('2025-01-25', InputEventType.VESET, InputEventOna.YOM);
      cache.setEvents([v1, v2, v3]);

      const all = flatten(await firstValueFrom(cal.highlightedInputEvents$));
      const haflagot = all.filter(e =>
        e.outputEventType === DayType.HAFLAGA_DAY ||
        e.outputEventType === DayType.HAFLAGA_NIGHT,
      );

      expect(haflagot.length).toBe(1);
      expect(dayDiff(v3.simpleDate, haflagot[0].simpleDate)).toBe(15);
      expect(haflagot[0].details).toContain('חשש וסת הפלגה - יום (16 ימים)');
    });

    it('Chabad: does not mark Haflaga from a Hefsek without an earlier sighting', async () => {
      const h1 = makeEvent('2025-01-05', InputEventType.HEFSEK_TAHARA);
      const v1 = makeEvent('2025-01-10', InputEventType.VESET, InputEventOna.YOM);
      cache.setEvents([h1, v1]);

      const all = flatten(await firstValueFrom(cal.highlightedInputEvents$));
      expect(all.some(e =>
        e.outputEventType === DayType.HAFLAGA_DAY ||
        e.outputEventType === DayType.HAFLAGA_NIGHT,
      )).toBe(false);
    });

    it('Chabad: marks Haflaga after Veset, Hefsek Tahara, and another Veset', async () => {
      const v1 = makeEvent('2025-01-01', InputEventType.VESET, InputEventOna.YOM);
      const h1 = makeEvent('2025-01-05', InputEventType.HEFSEK_TAHARA);
      const v2 = makeEvent('2025-01-10', InputEventType.VESET, InputEventOna.YOM);
      cache.setEvents([v1, h1, v2]);

      const all = flatten(await firstValueFrom(cal.highlightedInputEvents$));
      const haflaga = all.find(e => e.outputEventType === DayType.HAFLAGA_DAY)!;

      expect(haflaga).toBeTruthy();
      expect(dayDiff(v2.simpleDate, haflaga.simpleDate)).toBe(5);
      expect(haflaga.segments[0].onah).toBe(InputEventOna.DAY);
      expect(haflaga.details).toContain('חשש וסת הפלגה - יום (10 עונות)');
    });

    it('Chabad: when a later Hefsek exists, counts Haflaga from that Hefsek Tahara', async () => {
      const v0 = makeEvent('2025-01-01', InputEventType.VESET, InputEventOna.YOM);
      const h1 = makeEvent('2025-01-05', InputEventType.HEFSEK_TAHARA);
      const v1 = makeEvent('2025-01-10', InputEventType.VESET, InputEventOna.YOM);
      const h2 = makeEvent('2025-01-14', InputEventType.HEFSEK_TAHARA);
      cache.setEvents([v0, h1, v1, h2]);

      const all = flatten(await firstValueFrom(cal.highlightedInputEvents$));
      const haflaga = all.find(e => e.outputEventType === DayType.HAFLAGA_DAY)!;

      expect(haflaga).toBeTruthy();
      expect(dayDiff(h2.simpleDate, haflaga.simpleDate)).toBe(5);
      expect(haflaga.segments[0].onah).toBe(InputEventOna.DAY);
      expect(haflaga.details).toContain('חשש וסת הפלגה - יום (10 עונות)');
    });

    it('Chabad: a shorter Haflaga does not cancel a longer Haflaga', async () => {
      const v0 = makeEvent('2024-12-28', InputEventType.VESET, InputEventOna.YOM);
      const h1 = makeEvent('2025-01-01', InputEventType.HEFSEK_TAHARA);
      const v1 = makeEvent('2025-01-26', InputEventType.VESET, InputEventOna.YOM); // 50 onot
      const h2 = makeEvent('2025-01-30', InputEventType.HEFSEK_TAHARA);
      const v2 = makeEvent('2025-02-22', InputEventType.VESET, InputEventOna.LAYLA); // 47 onot
      const h3 = makeEvent('2025-02-26', InputEventType.HEFSEK_TAHARA);
      cache.setEvents([v0, h1, v1, h2, v2, h3]);

      const all = flatten(await firstValueFrom(cal.highlightedInputEvents$));
      const haflagot = all.filter(e =>
        e.outputEventType === DayType.HAFLAGA_DAY ||
        e.outputEventType === DayType.HAFLAGA_NIGHT,
      );

      expect(haflagot.length).toBe(2);
      expect(haflagot.some(e =>
        dayDiff(h3.simpleDate, e.simpleDate) === 25 &&
        e.outputEventType === DayType.HAFLAGA_DAY &&
        e.details.includes('חשש וסת הפלגה - יום (50 עונות)'),
      )).toBe(true);
      expect(haflagot.some(e =>
        dayDiff(h3.simpleDate, e.simpleDate) === 23 &&
        e.outputEventType === DayType.HAFLAGA_NIGHT &&
        e.details.includes('חשש וסת הפלגה - לילה (47 עונות)'),
      )).toBe(true);
    });

    it('Chabad: a longer Haflaga cancels shorter Haflagot', async () => {
      const v0 = makeEvent('2024-12-28', InputEventType.VESET, InputEventOna.YOM);
      const h1 = makeEvent('2025-01-01', InputEventType.HEFSEK_TAHARA);
      const v1 = makeEvent('2025-01-24', InputEventType.VESET, InputEventOna.LAYLA); // 47 onot
      const h2 = makeEvent('2025-01-28', InputEventType.HEFSEK_TAHARA);
      const v2 = makeEvent('2025-02-22', InputEventType.VESET, InputEventOna.YOM); // 50 onot
      const h3 = makeEvent('2025-02-26', InputEventType.HEFSEK_TAHARA);
      cache.setEvents([v0, h1, v1, h2, v2, h3]);

      const all = flatten(await firstValueFrom(cal.highlightedInputEvents$));
      const haflagot = all.filter(e =>
        e.outputEventType === DayType.HAFLAGA_DAY ||
        e.outputEventType === DayType.HAFLAGA_NIGHT,
      );

      expect(haflagot.length).toBe(1);
      expect(dayDiff(h3.simpleDate, haflagot[0].simpleDate)).toBe(25);
      expect(haflagot[0].outputEventType).toBe(DayType.HAFLAGA_DAY);
      expect(haflagot[0].details).toContain('חשש וסת הפלגה - יום (50 עונות)');
    });
  });

  // ---------------------------------------------------------------------------
  // validateNewInputEvent
  // ---------------------------------------------------------------------------
  describe('validateNewInputEvent()', () => {
    it('returns null for non-Hefsek events', () => {
      const v = makeEvent('2025-01-10', InputEventType.VESET);
      expect(cal.validateNewInputEvent(v)).toBeNull();
    });

    it('rejects a Hefsek Tahara with no preceding sighting', () => {
      const hefsek = makeEvent('2025-01-10', InputEventType.HEFSEK_TAHARA);
      const err = cal.validateNewInputEvent(hefsek);
      expect(err).toBeTruthy();
      expect(err).toMatch(/ללא וסת/);
    });

    it('rejects a Hefsek Tahara before the minimum niddah days (Chabad: 5)', () => {
      const v = makeEvent('2025-01-10', InputEventType.VESET);
      cache.setEvents([v]);
      // day 4 → diff=3, minDiff=4 → rejected
      const hefsek = makeEvent('2025-01-13', InputEventType.HEFSEK_TAHARA);
      const err = cal.validateNewInputEvent(hefsek);
      expect(err).toBeTruthy();
      expect(err).toMatch(/לפחות 5 ימי נידה/);
    });

    it('accepts a Hefsek Tahara on the 5th niddah day (Chabad)', () => {
      const v = makeEvent('2025-01-10', InputEventType.VESET);
      cache.setEvents([v]);
      const hefsek = makeEvent('2025-01-14', InputEventType.HEFSEK_TAHARA); // diff=4 == minDiff
      expect(cal.validateNewInputEvent(hefsek)).toBeNull();
    });

    it('accepts a Hefsek Tahara on the 4th niddah day for Rav Ovadia', () => {
      approach.approach$.next(APPROACH_SEPHARDI_OVADIA);
      const v = makeEvent('2025-01-10', InputEventType.VESET);
      cache.setEvents([v]);
      const hefsek = makeEvent('2025-01-13', InputEventType.HEFSEK_TAHARA); // diff=3 == minDiff
      expect(cal.validateNewInputEvent(hefsek)).toBeNull();
    });

    it('rejects a Rav Ovadia Hefsek Tahara on day 3 (too early)', () => {
      approach.approach$.next(APPROACH_SEPHARDI_OVADIA);
      const v = makeEvent('2025-01-10', InputEventType.VESET);
      cache.setEvents([v]);
      const hefsek = makeEvent('2025-01-12', InputEventType.HEFSEK_TAHARA);
      const err = cal.validateNewInputEvent(hefsek);
      expect(err).toMatch(/לפחות 4 ימי נידה/);
    });

    it('requires 5 niddah days after Ketem Tame for Rav Mordechai Eliyahu', () => {
      approach.approach$.next(APPROACH_SEPHARDI_MORDECHAI_ELIYAHU);
      const ketem = makeEvent('2025-01-10', InputEventType.KETEM_TAME);
      cache.setEvents([ketem]);

      const day4Hefsek = makeEvent('2025-01-13', InputEventType.HEFSEK_TAHARA);
      expect(cal.validateNewInputEvent(day4Hefsek)).toMatch(/לפחות 5 ימי נידה/);

      const day5Hefsek = makeEvent('2025-01-14', InputEventType.HEFSEK_TAHARA);
      expect(cal.validateNewInputEvent(day5Hefsek)).toBeNull();
    });

    it('allows Rav Ovadia Hefsek Tahara on day 4, but not earlier, after Ketem Tame', () => {
      approach.approach$.next(APPROACH_SEPHARDI_OVADIA);
      const ketem = makeEvent('2025-01-10', InputEventType.KETEM_TAME);
      cache.setEvents([ketem]);

      const day3Hefsek = makeEvent('2025-01-12', InputEventType.HEFSEK_TAHARA);
      expect(cal.validateNewInputEvent(day3Hefsek)).toMatch(/לפחות 4 ימי נידה/);

      const day4Hefsek = makeEvent('2025-01-13', InputEventType.HEFSEK_TAHARA);
      expect(cal.validateNewInputEvent(day4Hefsek)).toBeNull();
    });

    it('allows Hefsek Tahara on day 4 after Bdika Tmea for Rav Ovadia', () => {
      approach.approach$.next(APPROACH_SEPHARDI_OVADIA);
      const bdika = makeEvent('2025-01-10', InputEventType.BDIKA_TMEA);
      cache.setEvents([bdika]);

      const day3Hefsek = makeEvent('2025-01-12', InputEventType.HEFSEK_TAHARA);
      expect(cal.validateNewInputEvent(day3Hefsek)).toMatch(/לפחות 4 ימי נידה/);

      const day4Hefsek = makeEvent('2025-01-13', InputEventType.HEFSEK_TAHARA);
      expect(cal.validateNewInputEvent(day4Hefsek)).toBeNull();
    });

    it('rejects another Hefsek Tahara after the current cycle already has one', () => {
      const veset = makeEvent('2025-01-10', InputEventType.VESET);
      const existingHefsek = makeEvent('2025-01-14', InputEventType.HEFSEK_TAHARA);
      cache.setEvents([veset, existingHefsek]);

      const duplicateHefsek = makeEvent('2025-01-20', InputEventType.HEFSEK_TAHARA);
      expect(cal.validateNewInputEvent(duplicateHefsek)).toMatch(/כבר נוסף הפסק טהרה/);
    });
  });

  // ---------------------------------------------------------------------------
  // canAddHefsekTahara
  // ---------------------------------------------------------------------------
  describe('canAddHefsekTahara()', () => {
    it('returns false when no prior sighting exists', () => {
      cache.setEvents([]);
      expect(cal.canAddHefsekTahara(new Date('2025-01-10T12:00:00Z'))).toBe(false);
    });

    it('returns false before the minimum Hefsek day after a Chabad VESET', () => {
      cache.setEvents([makeEvent('2025-01-10', InputEventType.VESET)]);
      expect(cal.canAddHefsekTahara(new Date('2025-01-13T12:00:00Z'))).toBe(false);
    });

    it('returns true on the minimum Hefsek day after a Chabad VESET', () => {
      cache.setEvents([makeEvent('2025-01-10', InputEventType.VESET)]);
      expect(cal.canAddHefsekTahara(new Date('2025-01-14T12:00:00Z'))).toBe(true);
    });

    it('returns true on the 4th niddah day after a Rav Ovadia VESET', () => {
      approach.approach$.next(APPROACH_SEPHARDI_OVADIA);
      cache.setEvents([makeEvent('2025-01-10', InputEventType.VESET)]);
      expect(cal.canAddHefsekTahara(new Date('2025-01-13T12:00:00Z'))).toBe(true);
    });

    it('returns true on day 4, but not earlier, after a Rav Ovadia Ketem Tame', () => {
      approach.approach$.next(APPROACH_SEPHARDI_OVADIA);
      cache.setEvents([makeEvent('2025-01-10', InputEventType.KETEM_TAME)]);
      expect(cal.canAddHefsekTahara(new Date('2025-01-12T12:00:00Z'))).toBe(false);
      expect(cal.canAddHefsekTahara(new Date('2025-01-13T12:00:00Z'))).toBe(true);
    });

    it('returns false before day 5 after a non-Ovadia Ketem Tame', () => {
      approach.approach$.next(APPROACH_SEPHARDI_MORDECHAI_ELIYAHU);
      cache.setEvents([makeEvent('2025-01-10', InputEventType.KETEM_TAME)]);
      expect(cal.canAddHefsekTahara(new Date('2025-01-13T12:00:00Z'))).toBe(false);
    });

    it('returns false when the only sighting is in the future', () => {
      cache.setEvents([makeEvent('2025-01-20', InputEventType.VESET)]);
      expect(cal.canAddHefsekTahara(new Date('2025-01-10T12:00:00Z'))).toBe(false);
    });

    it('returns false after the current cycle already has a Hefsek Tahara', () => {
      cache.setEvents([
        makeEvent('2025-01-10', InputEventType.VESET),
        makeEvent('2025-01-14', InputEventType.HEFSEK_TAHARA),
      ]);

      expect(cal.canAddHefsekTahara(new Date('2025-01-20T12:00:00Z'))).toBe(false);
    });

    it('becomes eligible again only after a new sighting and its minimum days', () => {
      cache.setEvents([
        makeEvent('2025-01-01', InputEventType.VESET),
        makeEvent('2025-01-05', InputEventType.HEFSEK_TAHARA),
        makeEvent('2025-01-20', InputEventType.BDIKA_TMEA),
      ]);

      expect(cal.canAddHefsekTahara(new Date('2025-01-23T12:00:00Z'))).toBe(false);
      expect(cal.canAddHefsekTahara(new Date('2025-01-24T12:00:00Z'))).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Fixed and semi-fixed veset state
  // ---------------------------------------------------------------------------
  describe('fixed and semi-fixed veset state', () => {
    const monthlySightings = (
      days: number[],
      startMonth = months.TISHREI,
      startYear = 5787,
      ona: InputEventOna = InputEventOna.DAY,
    ) => {
      const start = hDateToHebrewDateKey(new HDate(1, startMonth, startYear));
      return days.map((day, index) => makeHebrewEvent(
        hebrewDateKeyToHDate({ ...addHebrewMonths(start, index), day }),
        InputEventType.VESET,
        ona,
      ));
    };

    it('establishes a same-date fixed veset only after three consecutive occurrences', () => {
      const [first, second, third] = monthlySightings([1, 1, 1]);
      expect(cal.calculateVesetPatternState(
        [first, second], APPROACH_CHABAD, second.hebrewDate,
      ).fixed).toBeNull();

      const state = cal.calculateVesetPatternState(
        [first, second, third], APPROACH_CHABAD, third.hebrewDate,
      );
      expect(state.fixed).toEqual(jasmine.objectContaining({
        kind: 'monthly-date',
        status: 'active',
        dayStep: 0,
        nextExpected: addHebrewMonths(third.hebrewDate, 1),
      }));
    });

    it('generates the next fixed concern on the original Night/Day segment', () => {
      const sightings = monthlySightings([1, 1, 1], months.TISHREI, 5787, InputEventOna.NIGHT);
      const concerns = cal.getFixedVesetConcerns(
        sightings, APPROACH_CHABAD, sightings[2].hebrewDate,
      );
      expect(concerns.length).toBe(120);
      expect(concerns[0].outputEventType).toBe(DayType.VESET_KAVUA);
      expect(concerns[0].segments).toEqual([{
        hebrewDate: addHebrewMonths(sightings[2].hebrewDate, 1),
        onah: InputEventOna.NIGHT,
      }]);
    });

    it('shows Av, Elul, and Tishrei after future Iyar, Sivan, and Tammuz entries', async () => {
      const sightings = [months.IYYAR, months.SIVAN, months.TAMUZ].map(month =>
        makeHebrewEvent(
          new HDate(1, month, 5787),
          InputEventType.VESET,
          InputEventOna.DAY,
        ));
      cache.setEvents(sightings);

      const dict = await firstValueFrom(cal.highlightedInputEvents$);
      const fixed = flatten(dict)
        .filter(event => event.outputEventType === DayType.VESET_KAVUA);
      expect(fixed.slice(0, 3).map(event => event.segments[0])).toEqual([
        { hebrewDate: hDateToHebrewDateKey(new HDate(1, months.AV, 5787)), onah: InputEventOna.DAY },
        { hebrewDate: hDateToHebrewDateKey(new HDate(1, months.ELUL, 5787)), onah: InputEventOna.DAY },
        { hebrewDate: hDateToHebrewDateKey(new HDate(1, months.TISHREI, 5788)), onah: InputEventOna.DAY },
      ]);
      expect(fixed.length).toBe(120);
    });

    it('continues every first of the month after Sivan, Tammuz, and Av', async () => {
      const sightings = [months.SIVAN, months.TAMUZ, months.AV].map(month =>
        makeHebrewEvent(
          new HDate(1, month, 5787),
          InputEventType.VESET,
          InputEventOna.NIGHT,
        ));
      cache.setEvents(sightings);

      const dict = await firstValueFrom(cal.highlightedInputEvents$);
      const fixed = flatten(dict)
        .filter(event => event.outputEventType === DayType.VESET_KAVUA);
      const expectedMonths = [
        new HDate(1, months.ELUL, 5787),
        new HDate(1, months.TISHREI, 5788),
        new HDate(1, months.CHESHVAN, 5788),
        new HDate(1, months.KISLEV, 5788),
        new HDate(1, months.TEVET, 5788),
      ].map(hDateToHebrewDateKey);

      expect(fixed.slice(0, expectedMonths.length).map(event =>
        event.segments[0].hebrewDate,
      )).toEqual(expectedMonths);
      expect(fixed.every(event => event.segments[0].onah === InputEventOna.NIGHT)).toBe(true);

      for (const hdate of [
        new HDate(1, months.TISHREI, 5788),
        new HDate(1, months.CHESHVAN, 5788),
      ]) {
        const { year, month, day } = HDateToNgbDateStruct(hdate);
        expect(dict[year][month][day].some(event =>
          event.outputEventType === DayType.VESET_KAVUA,
        )).toBe(true);
      }
    });

    it('establishes a regular monthly dilug with an explicit equal non-zero step', () => {
      const sightings = monthlySightings([1, 2, 3]);
      const state = cal.calculateVesetPatternState(
        sightings, APPROACH_CHABAD, sightings[2].hebrewDate,
      );
      expect(state.fixed).toEqual(jasmine.objectContaining({
        kind: 'dilug',
        dayStep: 1,
        nextExpected: jasmine.objectContaining({ day: 4 }),
      }));
    });

    it('does not establish dilug when the two monthly steps differ', () => {
      const sightings = monthlySightings([1, 2, 4]);
      expect(cal.calculateVesetPatternState(
        sightings, APPROACH_CHABAD, sightings[2].hebrewDate,
      ).fixed).toBeNull();
    });

    it('keeps a fixed veset after one and two consecutive off-pattern sightings', () => {
      const sightings = monthlySightings([1, 1, 1]);
      const firstExpected = addHebrewMonths(sightings[2].hebrewDate, 1);
      const offPatternOne = makeHebrewEvent(
        hebrewDateKeyToHDate({ ...firstExpected, day: 2 }),
        InputEventType.VESET,
        InputEventOna.DAY,
      );
      const offPatternTwo = makeHebrewEvent(
        hebrewDateKeyToHDate({ ...addHebrewMonths(firstExpected, 1), day: 2 }),
        InputEventType.VESET,
        InputEventOna.DAY,
      );

      const one = cal.calculateVesetPatternState(
        [...sightings, offPatternOne], APPROACH_CHABAD, offPatternOne.hebrewDate,
      ).fixed!;
      const two = cal.calculateVesetPatternState(
        [...sightings, offPatternOne, offPatternTwo], APPROACH_CHABAD, offPatternTwo.hebrewDate,
      ).fixed!;
      expect(one.status).toBe('active');
      expect(one.consecutiveMisses).toBe(1);
      expect(two.status).toBe('active');
      expect(two.consecutiveMisses).toBe(2);
    });

    it('retains the old pattern as dormant after three off-pattern sightings and restores it on one match', () => {
      const sightings = monthlySightings([1, 1, 1]);
      const firstExpected = addHebrewMonths(sightings[2].hebrewDate, 1);
      const offPattern = [2, 3, 5].map((day, month) => makeHebrewEvent(
        hebrewDateKeyToHDate({ ...addHebrewMonths(firstExpected, month), day }),
        InputEventType.VESET,
        InputEventOna.DAY,
      ));
      const dormant = cal.calculateVesetPatternState(
        [...sightings, ...offPattern], APPROACH_CHABAD, offPattern[2].hebrewDate,
      ).fixed!;
      expect(dormant.status).toBe('dormant');
      expect(dormant.consecutiveMisses).toBe(3);

      const restoration = makeHebrewEvent(
        hebrewDateKeyToHDate(dormant.nextExpected),
        InputEventType.VESET,
        InputEventOna.DAY,
      );
      const restored = cal.calculateVesetPatternState(
        [...sightings, ...offPattern, restoration], APPROACH_CHABAD, restoration.hebrewDate,
      ).fixed!;
      expect(restored.status).toBe('active');
      expect(restored.consecutiveMisses).toBe(0);
    });

    it('suppresses Onah Beinonit while fixed but keeps Veset HaChodesh from an off-pattern sighting', async () => {
      const sightings = monthlySightings([1, 1, 1]);
      const offPatternDate = { ...addHebrewMonths(sightings[2].hebrewDate, 1), day: 2 };
      const offPattern = makeHebrewEvent(
        hebrewDateKeyToHDate(offPatternDate), InputEventType.VESET, InputEventOna.DAY,
      );
      cache.setEvents([...sightings, offPattern]);

      const all = flatten(await firstValueFrom(cal.highlightedInputEvents$));
      expect(all.some(event =>
        event.sourceEventId === offPattern.id && event.outputEventType === DayType.ONA_BEINONIT,
      )).toBe(false);
      expect(all.some(event =>
        event.sourceEventId === offPattern.id && event.outputEventType === DayType.VESET_HACHODESH_DAY,
      )).toBe(true);
    });

    it('restores Onah Beinonit on the third consecutive off-pattern sighting', async () => {
      const sightings = monthlySightings([1, 1, 1]);
      const firstExpected = addHebrewMonths(sightings[2].hebrewDate, 1);
      const offPattern = [2, 3, 5].map((day, month) => makeHebrewEvent(
        hebrewDateKeyToHDate({ ...addHebrewMonths(firstExpected, month), day }),
        InputEventType.VESET,
        InputEventOna.DAY,
      ));
      cache.setEvents([...sightings, ...offPattern]);
      const all = flatten(await firstValueFrom(cal.highlightedInputEvents$));
      expect(all.some(event =>
        event.sourceEventId === offPattern[2].id && event.outputEventType === DayType.ONA_BEINONIT,
      )).toBe(true);
    });

    it('establishes the >=31-day semi-fixed rule after three sightings for both Sephardi approaches', () => {
      const starts = [0, 31, 63];
      const sightings = starts.map((offset, index) => {
        const event = makeEvent('2026-01-01', InputEventType.VESET,
          index % 2 ? InputEventOna.NIGHT : InputEventOna.DAY);
        event.simpleDate = addDays(event.simpleDate, offset);
        event.hebrewDate = hDateToHebrewDateKey(new HDate(event.simpleDate));
        event.date = HDateToNgbDateStruct(new HDate(event.simpleDate));
        event.id = `long-cycle-${index}`;
        return event;
      });
      for (const sephardi of [APPROACH_SEPHARDI_OVADIA, APPROACH_SEPHARDI_MORDECHAI_ELIYAHU]) {
        const state = cal.calculateVesetPatternState(
          sightings, sephardi, sightings[2].hebrewDate,
        );
        expect(state.semiFixedSephardi).toBe(true);
        expect(state.suppressesOnahBeinonit).toBe(true);
      }
      expect(cal.calculateVesetPatternState(
        sightings, APPROACH_CHABAD, sightings[2].hebrewDate,
      ).semiFixedSephardi).toBe(false);
    });

    it('Elul 1, Tishrei 4, Cheshvan 8 suppresses only Onah Beinonit for both Sephardi approaches', async () => {
      const sightings = [
        makeHebrewEvent(new HDate(1, months.ELUL, 5787), InputEventType.VESET, InputEventOna.DAY),
        makeHebrewEvent(new HDate(4, months.TISHREI, 5788), InputEventType.VESET, InputEventOna.DAY),
        makeHebrewEvent(new HDate(8, months.CHESHVAN, 5788), InputEventType.VESET, InputEventOna.DAY),
      ];
      cache.setEvents(sightings);

      for (const sephardi of [APPROACH_SEPHARDI_OVADIA, APPROACH_SEPHARDI_MORDECHAI_ELIYAHU]) {
        approach.approach$.next(sephardi);
        const latestConcerns = flatten(await firstValueFrom(cal.highlightedInputEvents$))
          .filter(event => event.sourceEventId === sightings[2].id);

        expect(latestConcerns.some(event =>
          event.outputEventType === DayType.ONA_BEINONIT,
        )).toBe(false);
        expect(latestConcerns.some(event =>
          event.outputEventType === DayType.VESET_HACHODESH_DAY,
        )).toBe(true);
        expect(latestConcerns.some(event =>
          event.outputEventType === DayType.HAFLAGA_DAY,
        )).toBe(true);
      }
    });

    it('one subsequent cycle below 31 days immediately ends the Sephardi semi-fixed state', () => {
      const offsets = [0, 31, 63, 92];
      const sightings = offsets.map((offset, index) => {
        const hdate = new HDate(addDays(new Date('2026-01-01T12:00:00Z'), offset));
        const event = makeHebrewEvent(
          hdate, InputEventType.VESET, index % 2 ? InputEventOna.NIGHT : InputEventOna.DAY,
        );
        event.id = `cycle-${index}`;
        return event;
      });
      const state = cal.calculateVesetPatternState(
        sightings, APPROACH_SEPHARDI_OVADIA, sightings[3].hebrewDate,
      );
      expect(state.semiFixedSephardi).toBe(false);
      expect(state.suppressesOnahBeinonit).toBe(false);
    });

    it('a short cycle from Shevat 10 to Adar 2 restores Onah Beinonit immediately', async () => {
      const sightings = [
        makeHebrewEvent(new HDate(1, months.KISLEV, 5785), InputEventType.VESET, InputEventOna.DAY),
        makeHebrewEvent(new HDate(5, months.TEVET, 5785), InputEventType.VESET, InputEventOna.DAY),
        makeHebrewEvent(new HDate(10, months.SHVAT, 5785), InputEventType.VESET, InputEventOna.DAY),
        makeHebrewEvent(new HDate(2, months.ADAR_I, 5785), InputEventType.VESET, InputEventOna.DAY),
      ];
      cache.setEvents(sightings);

      for (const sephardi of [APPROACH_SEPHARDI_OVADIA, APPROACH_SEPHARDI_MORDECHAI_ELIYAHU]) {
        approach.approach$.next(sephardi);
        const state = cal.calculateVesetPatternState(
          sightings, sephardi, sightings[3].hebrewDate,
        );
        expect(state.semiFixedSephardi).toBe(false);

        const latestConcerns = flatten(await firstValueFrom(cal.highlightedInputEvents$))
          .filter(event => event.sourceEventId === sightings[3].id);
        expect(latestConcerns.some(event =>
          event.outputEventType === DayType.ONA_BEINONIT,
        )).toBe(true);
      }
    });

    it('establishes across the Hebrew year boundary (Av, Elul, Tishrei)', () => {
      const dates = [
        new HDate(5, months.AV, 5787),
        new HDate(5, months.ELUL, 5787),
        new HDate(5, months.TISHREI, 5788),
      ];
      const sightings = dates.map(date =>
        makeHebrewEvent(date, InputEventType.VESET, InputEventOna.NIGHT));
      const fixed = cal.calculateVesetPatternState(
        sightings, APPROACH_CHABAD, sightings[2].hebrewDate,
      ).fixed!;
      expect(fixed.status).toBe('active');
      expect(fixed.nextExpected).toEqual(hDateToHebrewDateKey(
        new HDate(5, months.CHESHVAN, 5788),
      ));
    });
  });

  // ---------------------------------------------------------------------------
  // removeEvent – cascade orphaned Hefsek Tahara
  // ---------------------------------------------------------------------------
  describe('removeEvent() cascade', () => {
    it('removes only the targeted event when the Hefsek still has a preceding sighting', () => {
      const v1 = makeEvent('2025-01-01', InputEventType.VESET);
      const v2 = makeEvent('2025-01-10', InputEventType.VESET);
      const hefsek = makeEvent('2025-01-14', InputEventType.HEFSEK_TAHARA);
      cache.setEvents([v1, v2, hefsek]);

      cal.removeEvent(v2);

      const remaining = cache.getInputEvents();
      expect(remaining.length).toBe(2);
      expect(remaining).toContain(jasmine.objectContaining({ type: InputEventType.HEFSEK_TAHARA }));
      expect(remaining).toContain(jasmine.objectContaining({ simpleDate: v1.simpleDate }));
    });

    it('cascade-removes an orphaned Hefsek Tahara when its only preceding sighting is deleted', () => {
      const v = makeEvent('2025-01-10', InputEventType.VESET);
      const hefsek = makeEvent('2025-01-14', InputEventType.HEFSEK_TAHARA);
      cache.setEvents([v, hefsek]);

      cal.removeEvent(v);

      expect(cache.getInputEvents().length).toBe(0);
    });

    it('cascade leaves the 7 nekiim days empty after the Hefsek Tahara is cascaded', async () => {
      const v = makeEvent('2025-01-10', InputEventType.VESET);
      const hefsek = makeEvent('2025-01-14', InputEventType.HEFSEK_TAHARA);
      cache.setEvents([v, hefsek]);

      cal.removeEvent(v);

      const all = flatten(await firstValueFrom(cal.highlightedInputEvents$));
      const nekiim = all.filter(e => e.details.some(d => /נקיים/.test(d)));
      expect(nekiim.length).toBe(0);
    });

    it('does NOT cascade-remove a Hefsek that still has a KETEM_TAME or BDIKA_TMEA before it', () => {
      const ketem = makeEvent('2025-01-10', InputEventType.KETEM_TAME);
      const v = makeEvent('2025-01-11', InputEventType.VESET);
      const hefsek = makeEvent('2025-01-15', InputEventType.HEFSEK_TAHARA);
      cache.setEvents([ketem, v, hefsek]);

      cal.removeEvent(v);

      const remaining = cache.getInputEvents();
      expect(remaining.some(e => e.type === InputEventType.HEFSEK_TAHARA)).toBe(true);
      expect(remaining.some(e => e.type === InputEventType.KETEM_TAME)).toBe(true);
    });
  });
});

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function flatten(dict: CalEventDict): OutputEvent[] {
  const out: OutputEvent[] = [];
  for (const yearKey of Object.keys(dict)) {
    const year = dict[yearKey as unknown as number];
    for (const monthKey of Object.keys(year)) {
      const month = year[monthKey as unknown as number];
      for (const dayKey of Object.keys(month)) {
        out.push(...month[dayKey as unknown as number]);
      }
    }
  }
  return out;
}
