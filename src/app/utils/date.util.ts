import { HDate, HebrewDateEvent, Location, Zmanim } from "@hebcal/core";
import days from '../../assets/data/days.json';
import { NgbDateStruct } from "@ng-bootstrap/ng-bootstrap";
import { HebrewDateKey } from "../interfaces/cal";

/**
 * 
 * @param date Date object
 * @param afterSunset  boolean - if true, the date will be set to the next day after sunset
 * @returns  HDate object
 * @example
 * ```ts
 * const date = new Date();
 * const hdate = dateToHDate(date, true);
 * console.log(hdate); // Outputs: HDate { day: 11, mm: 5, year: 5785 }
 * ```
 * @see {@link HDate}
 */
export function dateToHDate(date: Date, afterSunset: boolean): HDate {
    if (afterSunset) date.setDate(date.getDate() + 1);
    const hdate = new HDate(date);
    return hdate;
}

/**
 * 
 * @param hebrewDate HDate object
 * @returns string in the format '10 Av 5785' 
 * @example 
 * ```ts
 * const hebrewDate = new HDate(new Date());
 * const hebrewDateString = hebDateToHebrew(hebrewDate);
 * console.log(hebrewDateString); // Outputs: "כ״ג אב תשפ״ה"
 * ```
 * @see {@link HDate}
 */
export function hebDateToHebrew(hebrewDate: HDate): string {
    const as = new HebrewDateEvent(hebrewDate);
    const rtn = as.render('he-x-NoNikud');
    return rtn;
}

/**
 * 
 * @param zmanim HDate object
 * @returns 
 * @example
 * ```ts
 * const zmanim = new HDate(new Date());
 * const dayString = getDayString(zmanim);
 * console.log(dayString); // Outputs: "יום ראשון, כ״ג אב תשפ״ה"
 * ```
 */
export function getDayString(zmanim: HDate): string {
      const day = new HebrewDateEvent(zmanim).getDate().getDay();
      const dateStr = `יום ${days[day]}, ${hebDateToHebrew(zmanim)}`;
      return dateStr;
    
}

/**
 * 
 * @param date Date object
 * @returns HDate object
 * @example
 * ```ts
 * const date = new Date();
 * const hebrewDate = simpleDateToHebrew(date);
 * console.log(hebrewDate); // Outputs: HDate { day: 11, mm: 5, year: 5785 }
 * ```
 */
export function simpleDateToHebrew(date: Date): HDate {
    const a = new HDate(date);
    return a;
}

/**
 * 
 * @param hDateSunsetAwareString string in the format '10 Av 5785'
 * @returns HDate object
 * @example
 * ```ts
 * const hDate = hDateStringToHDate('10 Av 5785');
 * returns: HDate { day: 10, mm: 5, year: 5785 }
 * ```
 */
export function hDateStringToHDate(hDateSunsetAwareString: string): HDate {
    const [day, month, year] = hDateSunsetAwareString.split(' ');
    return new HDate(parseInt(day), month, parseInt(year));
}

/**
 * 
 * @param hDateSunsetAwareString string in the format '10 Av 5785'
 * @returns Date object
 * @example
 * ```ts
 * const date = hDateSunsetAwareStringToDate('10 Av 5785');
 * // Outputs: Date Object '2025-08-04T00:00:00.000Z'
 * ```
 */
export function hDateSunsetAwareStringToDate(hDateSunsetAwareString: string): Date {
    const hDate = hDateStringToHDate(hDateSunsetAwareString);
    const gregDate = hDate.greg();
    return new Date(Date.UTC(gregDate.getFullYear(), gregDate.getMonth(), gregDate.getDate()));
}

export function hebrewDateToDate(hebrewDate: string, closestCity: Location): Date {

    console.log('lastValueFrom:', closestCity);

    const hDate = HDate.fromGematriyaString(hebrewDate);
    const zmanAwware = Zmanim.makeSunsetAwareHDate(closestCity, hDate.greg(), true);
    return zmanAwware.greg();
}

/**
 * 
 * @param hDateSunsetAwareString string in the format '10 Av 5785'
 * @returns string in the format '2025-08-04'
 * @example
 * ```ts
 * const date = getDateParam('10 Av 5785');
 * console.log(date); // Outputs: "2025-08-04"
 * ```
 */
export function getDateParam(hDateSunsetAwareString: string): string {
    const newDate = hDateSunsetAwareStringToDate(hDateSunsetAwareString);
    const date = newDate.toISOString().split('T')[0];
    return date;
}

/**
 * 
 * @param heb NgbDateStruct with hebrew date
 * @returns HDate object
 * @example
 * ```ts
 * const heb: NgbDateStruct = { day: 10, month: 1, year: 5785 };
 * const hDate = NgbDateStructToHDate(heb);
 * console.log(hDate); // Outputs: HDate { day: 10, mm: 7, year: 5785 }
 * ```
 */
export function NgbDateStructToHDate(heb: NgbDateStruct): HDate {
    const monthsBeforeNisan = HDate.isLeapYear(heb.year) ? 7 : 6;
    const hebcalMonth = heb.month <= monthsBeforeNisan
        ? heb.month + 6
        : heb.month - monthsBeforeNisan;
    return new HDate(heb.day, hebcalMonth, heb.year);
}

/**
 * 
 * @param heb HDate object
 * @returns NgbDateStruct with hebrew date
 * @example
 * ```ts
 * const hDate = new HDate(10, 7, 5785);
 * const heb = HDateToNgbDateStruct(hDate);
 * console.log(heb); // Outputs: { day: 10, month: 1, year: 5785 }
 * ```
 */
export function HDateToNgbDateStruct(heb: HDate): NgbDateStruct {
    const hebcalMonth = heb.getMonth();
    const monthsBeforeNisan = heb.isLeapYear() ? 7 : 6;
    return {
        day: heb.getDate(),
        month: hebcalMonth >= 7
            ? hebcalMonth - 6
            : hebcalMonth + monthsBeforeNisan,
        year: heb.getFullYear(),
    };
}

export function hDateToHebrewDateKey(date: HDate): HebrewDateKey {
    return {
        year: date.getFullYear(),
        month: date.getMonth(),
        day: date.getDate(),
    };
}

export function hebrewDateKeyToHDate(date: HebrewDateKey): HDate {
    return new HDate(date.day, date.month, date.year);
}

/** Adds absolute Hebrew calendar days; Gregorian midnight is not involved. */
export function addHebrewDays(date: HebrewDateKey, days: number): HebrewDateKey {
    return hDateToHebrewDateKey(hebrewDateKeyToHDate(date).add(days, 'd'));
}

/**
 * Returns the same Hebrew day number in the following Hebrew month.
 *
 * When day 30 does not exist in the following month, HDate normalization keeps
 * the application's existing behavior and rolls it to day 1 of the subsequent
 * month. This is a Hebrew-month operation, not elapsed-day arithmetic.
 */
export function addHebrewMonths(date: HebrewDateKey, monthsToAdd: number): HebrewDateKey {
    if (!Number.isInteger(monthsToAdd)) {
        throw new TypeError('Hebrew months must be added as a whole number');
    }

    let hdate = hebrewDateKeyToHDate(date);
    const direction = monthsToAdd >= 0 ? 1 : -1;
    for (let index = 0; index < Math.abs(monthsToAdd); index++) {
        const year = hdate.getFullYear();
        const month = hdate.getMonth();
        let targetYear = year;
        let targetMonth: number;

        if (direction > 0) {
            if (month === 6) { // Elul -> Tishrei of the next Hebrew year
                targetYear += 1;
                targetMonth = 7;
            } else if (month === HDate.monthsInYear(year)) { // Adar/Adar II -> Nisan
                targetMonth = 1;
            } else {
                targetMonth = month + 1;
            }
        } else {
            if (month === 7) { // Tishrei -> Elul of the previous Hebrew year
                targetYear -= 1;
                targetMonth = 6;
            } else if (month === 1) { // Nisan -> Adar/Adar II
                targetMonth = HDate.monthsInYear(year);
            } else {
                targetMonth = month - 1;
            }
        }

        hdate = new HDate(hdate.getDate(), targetMonth, targetYear);
    }
    return hDateToHebrewDateKey(hdate);
}

/** Veset HaChodesh coordinate: the same Hebrew day number in the next Hebrew month. */
export function sameHebrewDayInNextMonth(date: HebrewDateKey): HebrewDateKey {
    return addHebrewMonths(date, 1);
}
