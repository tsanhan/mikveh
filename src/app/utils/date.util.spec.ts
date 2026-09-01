import { HDate, months } from '@hebcal/core';

import { addHebrewDays, addHebrewMonths, HDateToNgbDateStruct, NgbDateStructToHDate, sameHebrewDayInNextMonth } from './date.util';

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

describe('Hebrew calendar arithmetic', () => {
  const key = (day: number, month: number, year: number) => ({ day, month, year });

  it('counts Onah Beinonit as the 30th inclusive day by adding 29 Hebrew days', () => {
    expect(addHebrewDays(key(1, months.NISAN, 5786), 29))
      .toEqual(key(30, months.NISAN, 5786));
    expect(addHebrewDays(key(15, months.NISAN, 5786), 29))
      .toEqual(key(14, months.IYYAR, 5786));
  });

  it('calculates Veset HaChodesh solely as the same day number in the next Hebrew month', () => {
    expect(sameHebrewDayInNextMonth(key(1, months.NISAN, 5786)))
      .toEqual(key(1, months.IYYAR, 5786));
    expect(sameHebrewDayInNextMonth(key(15, months.NISAN, 5786)))
      .toEqual(key(15, months.IYYAR, 5786));
    expect(sameHebrewDayInNextMonth(key(29, months.NISAN, 5786)))
      .toEqual(key(29, months.IYYAR, 5786));
    expect(sameHebrewDayInNextMonth(key(1, months.IYYAR, 5786)))
      .toEqual(key(1, months.SIVAN, 5786));
  });

  it('preserves the same day number from 29-day and 30-day source months', () => {
    expect(addHebrewMonths(key(1, months.NISAN, 5786), 1))
      .toEqual(key(1, months.IYYAR, 5786));
    expect(addHebrewMonths(key(29, months.NISAN, 5786), 1))
      .toEqual(key(29, months.IYYAR, 5786));
    expect(addHebrewMonths(key(1, months.IYYAR, 5786), 1))
      .toEqual(key(1, months.SIVAN, 5786));
    expect(addHebrewMonths(key(29, months.IYYAR, 5786), 1))
      .toEqual(key(29, months.SIVAN, 5786));
  });

  it('preserves the existing rollover when day 30 is absent in the following month', () => {
    expect(addHebrewMonths(key(30, months.NISAN, 5786), 1))
      .toEqual(key(1, months.SIVAN, 5786));
  });

  it('handles two-day Rosh Chodesh dates independently', () => {
    expect(addHebrewMonths(key(30, months.SHVAT, 5784), 1))
      .toEqual(key(30, months.ADAR_I, 5784));
    expect(addHebrewMonths(key(1, months.ADAR_I, 5784), 1))
      .toEqual(key(1, months.ADAR_II, 5784));
    expect(addHebrewMonths(key(30, months.SHVAT, 5785), 1))
      .toEqual(key(1, months.NISAN, 5785));
  });

  it('rolls Elul into Tishrei of the next Hebrew year', () => {
    expect(addHebrewMonths(key(1, months.ELUL, 5786), 1))
      .toEqual(key(1, months.TISHREI, 5787));
    expect(addHebrewMonths(key(29, months.ELUL, 5786), 1))
      .toEqual(key(29, months.TISHREI, 5787));
  });

  it('handles common-year Adar and leap-year Adar I/II', () => {
    expect(addHebrewMonths(key(1, months.ADAR_I, 5785), 1))
      .toEqual(key(1, months.NISAN, 5785));
    expect(addHebrewMonths(key(29, months.ADAR_I, 5785), 1))
      .toEqual(key(29, months.NISAN, 5785));

    expect(addHebrewMonths(key(1, months.ADAR_I, 5784), 1))
      .toEqual(key(1, months.ADAR_II, 5784));
    expect(addHebrewMonths(key(29, months.ADAR_I, 5784), 1))
      .toEqual(key(29, months.ADAR_II, 5784));
    expect(addHebrewMonths(key(30, months.ADAR_I, 5784), 1))
      .toEqual(key(1, months.NISAN, 5784));
    expect(addHebrewMonths(key(1, months.ADAR_II, 5784), 1))
      .toEqual(key(1, months.NISAN, 5784));
    expect(addHebrewMonths(key(29, months.ADAR_II, 5784), 1))
      .toEqual(key(29, months.NISAN, 5784));
  });

  it('relates Onah Beinonit and Veset HaChodesh by source-month length', () => {
    const deficientSource = key(1, months.IYYAR, 5786);
    expect(addHebrewDays(deficientSource, 29))
      .toEqual(addHebrewMonths(deficientSource, 1));

    const fullSource = key(1, months.NISAN, 5786);
    const beinonit = addHebrewDays(fullSource, 29);
    const hachodesh = addHebrewMonths(fullSource, 1);
    expect(hebrewDateKeyToAbs(hachodesh) - hebrewDateKeyToAbs(beinonit)).toBe(1);
  });

  function hebrewDateKeyToAbs(date: { day: number; month: number; year: number }): number {
    return new HDate(date.day, date.month, date.year).abs();
  }
});
