import { HDate, HebrewDateEvent, Location, Zmanim } from "@hebcal/core";
import days from '../../assets/data/days.json';

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