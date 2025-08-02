import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Approaches, Approach, ApproachName } from '../interfaces/approaches';
import * as approaches from '../../assets/data/approaches.json';

@Injectable({
  providedIn: 'root'
})
export class ApproachService {
  //#region Approach
  public approaches$:BehaviorSubject<Approaches>;
  public approach$:BehaviorSubject<Approach>;
  //#endregion
  constructor() {
    this.approaches$ = new BehaviorSubject<Approaches>({...approaches});
    this.approach$ = new BehaviorSubject<Approach>(this.approaches$.getValue()[ApproachName.CHABAD]);
  }
}
