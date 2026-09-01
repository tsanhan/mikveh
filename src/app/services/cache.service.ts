import { inject, Injectable } from '@angular/core';
import { Storage, } from '@ionic/storage-angular';
import locations from '../../assets/data/locations.json';
import topicsJson from '../../assets/data/topics.json';
import { Location } from '../interfaces/locations';
import { IMikveh } from '../interfaces/mikveh.interface';
import { BehaviorSubject, map, Observable, shareReplay, tap } from 'rxjs';
import { ApproachService } from './approach.service';
import { CachedCalEvent, CachedInputEvent } from '../interfaces/cal';
import { Approach, ApproachName } from '../interfaces/approaches';
import { HDate } from '@hebcal/core';
import { HDateToNgbDateStruct, hDateToHebrewDateKey, NgbDateStructToHDate } from '../utils/date.util';

@Injectable({
  providedIn: 'root',
})
export class CacheService {
  storage = inject(Storage)
  mikvehStorage = inject(Storage)
  calEventsStorage = inject(Storage)

  approach = inject(ApproachService)

  private _storage: Storage = new Storage();
  private _mikvehStorage: Storage = new Storage();

  //#region Mikveh

  //#region calEvents
  private _calEventsStorage: Storage = new Storage();
  private _calEvents$ = new BehaviorSubject<CachedCalEvent[]>([]);
  private _inputEvents$ = new BehaviorSubject<CachedInputEvent[]>([]);

  public calEvents$ = this._calEvents$.asObservable().pipe(
    map(events => events.sort((a, b) => new Date(b.gregorianDateString).getTime() - new Date(a.gregorianDateString).getTime())),
    shareReplay(1)
  );

  public inputEvents$ = this._inputEvents$.asObservable();

  //#endregion

  //#region Location
  private locations$: BehaviorSubject<any>;
  private _location$: BehaviorSubject<Location>;
  public location$: Observable<Location>;
  //#endregion

  //#region Topics
  private _topics$ = new BehaviorSubject<any[]>(Array.from(topicsJson));
  public topics$ = this._topics$.asObservable();
  //#endregion



  //#region DarkMode
  private _darkMode$ = new BehaviorSubject<boolean>(false);
  public darkMode$ = this._darkMode$.asObservable();
  //#endregion

  //#region topics-data
  private _topicsData$ = new BehaviorSubject<any>([]);
  public topicsData$ = this._topicsData$.asObservable();
  //#endregion

  constructor() {
    console.log(this._topics$.getValue());
    this.locations$ = new BehaviorSubject(locations);
    this._location$ = new BehaviorSubject<Location>(this.locations$.getValue()['Jerusalem']);
    this.location$ = this._location$.asObservable();


    this.init();
  }

  private async init() {
    this._mikvehStorage = await this.mikvehStorage.create();
    this._storage = await this.storage.create();
    this._calEventsStorage = await this.calEventsStorage.create();


    const loc = await this._storage.get('location');
    if (!loc) {
      await this._storage.set('location', { ...this._location$.getValue() });
    } else {
      this._location$.next(loc);
    }

    const app = await this._storage.get('approach');
    if (!app) {
      await this._storage.set('approach', { ...this.approach.approach$.getValue() });
    } else {
      const normalizedApproach = this.normalizeApproach(app);
      this.approach.approach$.next(normalizedApproach);
      await this._storage.set('approach', normalizedApproach);
    }

    const calEvents = await this._calEventsStorage.get('calEvents');
    if (!calEvents) {
      await this._calEventsStorage.set('calEvents', []);
    } else {
      this._calEvents$.next(calEvents);
    }

    const inputEvents = await this._calEventsStorage.get('inputEvents');
    if (!inputEvents) {
      await this._calEventsStorage.set('inputEvents', []);
    } else {
      const normalizedInputEvents = inputEvents.map((event: CachedInputEvent) =>
        this.normalizeInputEvent(event),
      );
      this._inputEvents$.next(normalizedInputEvents);
      await this._calEventsStorage.set('inputEvents', normalizedInputEvents);
    }

    // const dm = await this._storage.get('darkMode');
    // if(dm !== null) {
    //   this.setDarkMode(dm);
    // }else {
    //   const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    //   this.setDarkMode(prefersDark.matches);
    // }

  }

  public setLocation(location: Location) {
    this._location$.next(location);
    this._storage.set('location', location);
  }

  public setApproach(key: string) {
    const approach = this.normalizeApproach(key);
    this.approach.approach$.next({ ...approach });
    this._storage.set('approach', approach);
  }

  public getApproach(key: string): Approach {
    return this.normalizeApproach(key);
  }

  private normalizeApproach(value: string | Approach): Approach {
    const approaches = this.approach.approaches$.getValue();
    const key = typeof value === 'string' ? value : value?.name;

    if (key === 'sfarad') {
      return { ...approaches[ApproachName.SEPHARDI_OVADIA] };
    }

    if (key === 'ashkenaz') {
      return { ...approaches[ApproachName.SEPHARDI_MORDECHAI_ELIYAHU] };
    }

    return { ...(approaches[key] ?? approaches[ApproachName.CHABAD]) };
  }

  public setDarkMode(darkMode: boolean) {
    this._darkMode$.next(darkMode);
    this._storage.set('darkMode', darkMode);
    document.body.classList[darkMode ? 'add' : 'remove']('dark');
  }

  public storeMikvehResults(data: IMikveh[]) {
    this._mikvehStorage.set('mikvehs', data);
  }
  public getMikvehResults(): Promise<IMikveh[]> {
    return this._mikvehStorage.get('mikvehs');
  }

  public setCalEvent(event: CachedCalEvent) {
    const currentEvents = this._calEvents$.getValue();
    currentEvents.push(event);
    this._calEvents$.next(currentEvents);
    this._calEventsStorage.set('calEvents', currentEvents);
  }

  public setInputEvents(event: CachedInputEvent) {
    const currentEvents = [...this._inputEvents$.getValue(), this.normalizeInputEvent(event)];
    this._inputEvents$.next(currentEvents);
    this._calEventsStorage.set('inputEvents', currentEvents);
  }

  private normalizeInputEvent(event: CachedInputEvent): CachedInputEvent {
    const simpleDate = new Date(event.simpleDate);
    const storedHebrewDate = event.hebrewDate;
    const hdate = storedHebrewDate
      ? new HDate(storedHebrewDate.day, storedHebrewDate.month, storedHebrewDate.year)
      : this.validStoredDate(event.date)
        ? NgbDateStructToHDate(event.date)
        : new HDate(simpleDate);
    return {
      ...event,
      id: event.id || this.createEventId(),
      hebrewDate: hDateToHebrewDateKey(hdate),
      simpleDate,
      date: HDateToNgbDateStruct(hdate),
    };
  }

  private validStoredDate(date?: { day: number; month: number; year: number }): boolean {
    if (!date || date.day < 1 || date.month < 1 || date.year < 1) return false;
    try {
      const roundTrip = HDateToNgbDateStruct(NgbDateStructToHDate(date));
      return roundTrip.day === date.day && roundTrip.month === date.month && roundTrip.year === date.year;
    } catch {
      return false;
    }
  }

  private createEventId(): string {
    return globalThis.crypto?.randomUUID?.() ??
      `calendar-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  public getCalEvents(): CachedCalEvent[] {
    const currentEvents = this._calEvents$.getValue();
    return currentEvents;
  }

  public getInputEvents(): CachedInputEvent[] {
    return this._inputEvents$.getValue();
  }

  public removeInputEvent(event: CachedInputEvent) {
    const remaining = this._inputEvents$.getValue().filter(
      e => e.id !== event.id,
    );
    this._inputEvents$.next(remaining);
    this._calEventsStorage.set('inputEvents', remaining);
  }


}
