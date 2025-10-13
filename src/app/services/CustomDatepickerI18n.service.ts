import { Injectable } from '@angular/core';
import { NgbDatepickerI18nHebrew } from '@ng-bootstrap/ng-bootstrap';

const WEEKDAYS = ['ב', 'ג', 'ד', 'ה', 'ו','ש', 'א', ];


@Injectable()
export class CustomDatepickerI18n extends NgbDatepickerI18nHebrew {

  override getWeekdayLabel(weekday: number): string {
    // weekday = 1 (Monday) to 7 (Sunday)
    return WEEKDAYS[weekday - 1];
  }

  override getDayAriaLabel(date: import("@ng-bootstrap/ng-bootstrap").NgbDateStruct): string {
    return `${date.day}-${date.month}-${date.year}`;
  }
}
