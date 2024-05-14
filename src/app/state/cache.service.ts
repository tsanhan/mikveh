import { inject, Injectable, signal, Signal, computed, WritableSignal, effect } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import * as locations from '../../assets/data/locations.json';
import * as approaches from '../../assets/data/approaches.json';
import * as topicsJson from '../../assets/data/topics.json';
import { Locations, Location } from './locations';
import { Approach, Approaches } from './approaches';
import { Topic } from './topics';

@Injectable({
  providedIn: 'root',
})
export class CacheService {
  private _storage: Storage = new Storage();

  //#region Location
  private locations: Signal<Locations> = signal({...locations});
  private _location:  WritableSignal<Location> = signal<Location>(this.locations()['Jerusalem']);
  public location = computed(() => this._location());
  //#endregion

  //#region Topics
  private _topics: Signal<Topic[]> = signal<any[]>(Array.from({...topicsJson}));
  public topics: Signal<Topic[]> = computed(() => this._topics());
  //#endregion

  //#region Approach
  public approaches: Signal<Approaches> = signal<Approaches>({...approaches});
  private _approach: WritableSignal<Approach> = signal<Approach>(this.approaches()['chabad']);
  public approach = computed(() => this._approach());
  //#endregion

  //#region DarkMode
  private _darkMode: WritableSignal<boolean> = signal<boolean>(false);
  public darkMode = computed(() => this._darkMode());
  //#endregion

  //#region topics-data
  private _topicsData: WritableSignal<any> = signal<any>([]);
  public topicsData = computed(() => this._topicsData());
  //#endregion

  constructor() {
    console.log(this.topics());

    this.init();
  }

  private async init() {
    this._storage = await inject(Storage).create();
    const loc = await this._storage.get('location');
    if(!loc) {
      await this._storage.set('location', {...this._location()});
    } else {
      this._location.set(loc);
    }

    const app = await this._storage.get('approach');
    if(!app) {
      await this._storage.set('approach', {...this._approach()});
    } else {
      this._approach.set(app);
    }

    const dm = await this._storage.get('darkMode');
    if(dm !== null) {
      this.setDarkMode(dm);
    }else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
      this.setDarkMode(prefersDark.matches);
    }

  }

  public setLocation(location: Location) {
    this._location.set(location);
    this._storage.set('location', location);
  }

  public setApproach(hebName: string) {
    const approach = this.approaches()[hebName];
    this._approach.set(approach);
    this._storage.set('approach', approach);
  }

  public setDarkMode(darkMode: boolean) {
    this._darkMode.set(darkMode);
    this._storage.set('darkMode', darkMode);
    document.body.classList[darkMode ? 'add':'remove']('dark');
  }

}
