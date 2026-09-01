import { HDate } from '@hebcal/core';

import { HDateToNgbDateStruct, NgbDateStructToHDate } from './date.util';

describe('Hebrew date conversion for ng-bootstrap', () => {
  it('maps Elul to month 12 instead of invalid month 0 in a regular year', () => {
    const elul = new HDate(3, 6, 5786);

    expect(HDateToNgbDateStruct(elul)).toEqual({ day: 3, month: 12, year: 5786 });
  });

  it('round-trips every month in a regular Hebrew year', () => {
    for (let month = 1; month <= 12; month++) {
      const original = new HDate(1, month, 5786);
      const roundTripped = NgbDateStructToHDate(HDateToNgbDateStruct(original));

      expect(roundTripped.getMonth()).withContext(`Hebcal month ${month}`).toBe(month);
    }
  });

  it('round-trips every month in a leap Hebrew year', () => {
    for (let month = 1; month <= 13; month++) {
      const original = new HDate(1, month, 5784);
      const roundTripped = NgbDateStructToHDate(HDateToNgbDateStruct(original));

      expect(roundTripped.getMonth()).withContext(`Hebcal leap month ${month}`).toBe(month);
    }
  });
});
