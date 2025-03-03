import { inject, Injectable } from '@angular/core';
import { Storage,  } from '@ionic/storage-angular';
import * as locations from '../../assets/data/locations.json';
import * as approaches from '../../assets/data/approaches.json';
import * as topicsJson from '../../assets/data/topics.json';
import { Location } from '../interfaces/locations';
import { Approach, Approaches } from '../interfaces/approaches';
import { IMikveh } from '../interfaces/mikveh.interface';
import { BehaviorSubject, share, shareReplay } from 'rxjs';


@Injectable({
  providedIn: 'root',
})
export class CacheService {
  storage =  inject(Storage)
  mikvehStorage = inject(Storage)
  private _storage: Storage = new Storage();
  private _mikvehStorage: Storage = new Storage();

  //#region Mikveh


  //#region Location
  private locations$ = new BehaviorSubject(locations);
  private _location$ = new BehaviorSubject<Location>(this.locations$.getValue()['Jerusalem']);
  public location$ = this._location$.asObservable();
  //#endregion

  //#region Topics
  private _topics$ = new BehaviorSubject<any[]>(Array.from({...topicsJson}));
  public topics$ = this._topics$.asObservable();
  //#endregion

  //#region Approach
  public approaches$ = new BehaviorSubject<Approaches>({...approaches});
  public approach$ = new BehaviorSubject<Approach>(this.approaches$.getValue()['chabad']);
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

    this.init();
  }

  private async init() {
    this._mikvehStorage = await this.mikvehStorage.create();
    this._storage = await this.storage.create();



    const loc = await this._storage.get('location');
    if(!loc) {
      await this._storage.set('location', {...this._location$.getValue()});
    } else {
      this._location$.next(loc);
    }

    const app = await this._storage.get('approach');
    if(!app) {
      await this._storage.set('approach', {...this.approach$.getValue()});
    } else {
      this.approach$.next(app);
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
    const approach = this.approaches$.getValue()[key];
    this.approach$.next({...approach});
    this._storage.set('approach', approach);
  }

  public setDarkMode(darkMode: boolean) {
    this._darkMode$.next(darkMode);
    this._storage.set('darkMode', darkMode);
    document.body.classList[darkMode ? 'add':'remove']('dark');
  }

  public storeMikvehResults(data:IMikveh[]) {
    this._mikvehStorage.set('mikvehs', data);
  }
  public getMikvehResults():Promise<IMikveh[]> {
    return this._mikvehStorage.get('mikvehs');
  }
}
