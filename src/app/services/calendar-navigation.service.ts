import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { OnahRef } from '../interfaces/cal';

/** Retains a notification target until the calendar is mounted and selects it. */
@Injectable({ providedIn: 'root' })
export class CalendarNavigationService {
  private readonly pending = new BehaviorSubject<OnahRef | null>(null);
  readonly requests$ = this.pending.asObservable();

  open(target: OnahRef): void {
    this.pending.next({ hebrewDate: { ...target.hebrewDate }, onah: target.onah });
  }

  consume(target: OnahRef): void {
    if (this.pending.value === target) this.pending.next(null);
  }
}
