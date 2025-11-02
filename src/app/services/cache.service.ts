import { inject, Injectable } from '@angular/core';
import { Storage, } from '@ionic/storage-angular';
import locations from '../../assets/data/locations.json';
import topicsJson from '../../assets/data/topics.json';
import { Location } from '../interfaces/locations';
import { IMikveh } from '../interfaces/mikveh.interface';
import { BehaviorSubject, map, Observable, shareReplay, tap } from 'rxjs';
import { ApproachService } from './approach.service';
import { CachedCalEvent, CachedInputEvent } from '../interfaces/cal';
import { Approach } from '../interfaces/approaches';

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
      this.approach.approach$.next(app);
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
      this._inputEvents$.next(inputEvents);
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
    const approach = this.approach.approaches$.getValue()[key];
    this.approach.approach$.next({ ...approach });
    this._storage.set('approach', approach);
  }

  public getApproach(key: string): Approach {
    return this.approach.approaches$.getValue()[key];
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
    const currentEvents = this._inputEvents$.getValue();
    currentEvents.push({...event});
    this._inputEvents$.next(currentEvents);
    this._calEventsStorage.set('inputEvents', currentEvents);

  }

  public getCalEvents(): CachedCalEvent[] {
    const currentEvents = this._calEvents$.getValue();
    return currentEvents;
  }


}
