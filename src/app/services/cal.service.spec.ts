import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { HDate } from '@hebcal/core';

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
import { HDateToNgbDateStruct } from '../utils/date.util';

// -----------------------------------------------------------------------------
// Test helpers
// -----------------------------------------------------------------------------

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const APPROACH_CHABAD: Approach = {
  name: ApproachName.CHABAD,
  nameHeb: 'חב"ד',
  svg: '',
};
const APPROACH_ASHKENAZI: Approach = {
  name: ApproachName.ASHKENAZI,
  nameHeb: 'אשכנזי',
  svg: '',
};
const APPROACH_SEPHARDI: Approach = {
  name: ApproachName.SEPHARDI,
  nameHeb: 'ספרדי',
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
    const t = new Date(event.simpleDate).getTime();
    const remaining = this._events$.getValue().filter(
      e =>
        !(new Date(e.simpleDate).getTime() === t &&
          e.type === event.type &&
          e.ona === event.ona),
    );
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
    it('returns exactly 7 days, starting one day after the Hefsek Tahara', () => {
      const hefsek = makeEvent('2025-01-10', InputEventType.HEFSEK_TAHARA);
      const days = cal.getSevenCleanDays(hefsek, [hefsek], APPROACH_CHABAD);

      expect(days.length).toBe(7);
      days.forEach((d, i) => {
        expect(dayDiff(hefsek.simpleDate, d.simpleDate)).toBe(i + 1);
      });
    });

    it('details are labelled "יום N/7 נקיים"', () => {
      const hefsek = makeEvent('2025-01-10', InputEventType.HEFSEK_TAHARA);
      const days = cal.getSevenCleanDays(hefsek, [hefsek], APPROACH_CHABAD);
      days.forEach((d, i) => {
        expect(d.details).toEqual([`יום ${i + 1}/7 נקיים`]);
      });
    });

    it('every nekiim day references the Hefsek Tahara that produced it', () => {
      const hefsek = makeEvent('2025-01-10', InputEventType.HEFSEK_TAHARA);
      const days = cal.getSevenCleanDays(hefsek, [hefsek], APPROACH_CHABAD);
      for (const d of days) {
        expect(d.CachedInputEventRef.type).toBe(InputEventType.HEFSEK_TAHARA);
        expect(d.CachedInputEventRef.simpleDate.getTime())
          .toBe(hefsek.simpleDate.getTime());
      }
    });

    // NOTE: currently the implementation tags each nekiim day with
    // DayType.MAHZOR instead of DayType.SEVEN_CLEAN. The template styles
    // .sevenCleans by DayType.SEVEN_CLEAN, so the days render as MAHZOR.
    it('tags each nekiim day with a DayType (currently MAHZOR – see suggestion)', () => {
      const hefsek = makeEvent('2025-01-10', InputEventType.HEFSEK_TAHARA);
      const days = cal.getSevenCleanDays(hefsek, [hefsek], APPROACH_CHABAD);
      for (const d of days) {
        expect(d.outputEventType).toBe(DayType.MAHZOR);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // getNidaDaysHashashotForVeset – single Veset (chainLast === veset)
  // ---------------------------------------------------------------------------
  describe('getNidaDaysHashashotForVeset() – single veset, no chain', () => {
    it('Ashkenazi/Chabad: 5 niddah days, CAN_START_CHECK_HEFSEK on day 5', () => {
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

    it('Sephardi: 4 niddah days, CAN_START_CHECK_HEFSEK on day 4', () => {
      const veset = makeEvent('2025-01-10', InputEventType.VESET);
      const out = cal.getNidaDaysHashashotForVeset(veset, veset, APPROACH_SEPHARDI);

      const mahzor = out.filter(e => e.outputEventType === DayType.MAHZOR);
      expect(mahzor.length).toBe(3); // days 2..4

      const startBdikot = out.find(
        e => e.outputEventType === DayType.CAN_START_CHECK_HEFSEK,
      )!;
      expect(dayDiff(veset.simpleDate, startBdikot.simpleDate)).toBe(3);
    });

    it('Ona Beinonit hashash is exactly 30 solar days after the veset', () => {
      const veset = makeEvent('2025-01-10', InputEventType.VESET);
      const out = cal.getNidaDaysHashashotForVeset(veset, veset, APPROACH_CHABAD);

      const onaBeinonit = out.find(e => e.outputEventType === DayType.ONA_BEINONIT)!;
      expect(onaBeinonit).toBeTruthy();
      expect(dayDiff(veset.simpleDate, onaBeinonit.simpleDate)).toBe(30);
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

      const vesetHDate = new HDate(veset.simpleDate);
      const expectedHDate = vesetHDate.add(1, 'M');

      expect(vesetHachodesh.date.day).toBe(expectedHDate.getDate());
      expect(vesetHachodesh.date.year).toBe(expectedHDate.getFullYear());
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

    it('accepts a Hefsek Tahara on the 4th niddah day for Sephardi', () => {
      approach.approach$.next(APPROACH_SEPHARDI);
      const v = makeEvent('2025-01-10', InputEventType.VESET);
      cache.setEvents([v]);
      const hefsek = makeEvent('2025-01-13', InputEventType.HEFSEK_TAHARA); // diff=3 == minDiff
      expect(cal.validateNewInputEvent(hefsek)).toBeNull();
    });

    it('rejects a Sephardi Hefsek Tahara on day 3 (too early)', () => {
      approach.approach$.next(APPROACH_SEPHARDI);
      const v = makeEvent('2025-01-10', InputEventType.VESET);
      cache.setEvents([v]);
      const hefsek = makeEvent('2025-01-12', InputEventType.HEFSEK_TAHARA);
      const err = cal.validateNewInputEvent(hefsek);
      expect(err).toMatch(/לפחות 4 ימי נידה/);
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

    it('returns true when a VESET exists on/before the date', () => {
      cache.setEvents([makeEvent('2025-01-10', InputEventType.VESET)]);
      expect(cal.canAddHefsekTahara(new Date('2025-01-14T12:00:00Z'))).toBe(true);
    });

    it('returns false when the only sighting is in the future', () => {
      cache.setEvents([makeEvent('2025-01-20', InputEventType.VESET)]);
      expect(cal.canAddHefsekTahara(new Date('2025-01-10T12:00:00Z'))).toBe(false);
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
