import { NgbDateStruct } from "@ng-bootstrap/ng-bootstrap";

export interface CalEventDict {
  [hebYear: number]: {
    [hebMonth: number]: {
      [hebDay: number]: OutputEvent[];
    }
  }
}

/** Canonical, UI-independent Hebrew calendar coordinate. Month uses Hebcal numbering. */
export interface HebrewDateKey {
  year: number;
  month: number;
  day: number;
}

export interface OnahRef {
  hebrewDate: HebrewDateKey;
  onah: InputEventOna;
}

export interface CachedCalEvent {
  type: InputEventType;
  hDateSunsetAwareString: string;
  gregorianDateString: string; // for easier debugging
  afterSunset: boolean;
}

export interface CalendarConcern {
  id: string;
  sourceEventId?: string;
  segments: OnahRef[];
  /** Technical Gregorian anchor retained while the older date-based calculations are migrated. */
  simpleDate: Date;
  /** Datepicker adapter value; not the semantic identity of the concern. */
  date: NgbDateStruct;
  outputEventType: DayType | InputEventType;
  CachedInputEventRef: CachedInputEvent;
  details: string[];
}

export type OutputEvent = CalendarConcern;


export interface CachedInputEvent {
  id: string;
  /** Semantic identity of the selected Hebrew calendar date. */
  hebrewDate: HebrewDateKey;
  /** Technical Gregorian conversion anchor, not the sighting timestamp. */
  simpleDate: Date;
  /** Datepicker adapter value retained for compatibility with the current UI. */
  date: NgbDateStruct;
  type: InputEventType;
  ona: InputEventOna;
}

export enum DayType {
  MAHZOR = 'mahzor',
  CAN_START_CHECK_HEFSEK = 'canStartHefsek',
  SEVEN_CLEAN = 'sevenCleans',
  MIKVEH_DAY = 'mikvehDay',
  MUTERET = 'muteret',
  PRISHA = 'prisha',
  ONA_BEINONIT = 'onaBeinonit',
  VESET_HACHODESH_DAY = 'vesetHachodeshDay',
  VESET_HACHODESH_NIGHT = 'vesetHachodeshNight',
  HAFLAGA_DAY = 'haflagaDay',
  HAFLAGA_NIGHT = 'haflagaNight',
}

export enum InputEventOna {
  DAY = 'yom',
  NIGHT = 'layla',
  /** @deprecated Use DAY. Kept for persisted-data and source compatibility. */
  YOM = 'yom',
  /** @deprecated Use NIGHT. Kept for persisted-data and source compatibility. */
  LAYLA = 'layla'
}

export enum InputEventType {
  HEFSEK_TAHARA = 'hefsekTahara',         // הפסק טהרה
  REIYA = 'reiya',                        // ראייה
  KETEM_TAME = 'ketemTame',               // כתם טמא
  BDIKA_TMEA = 'bdikaTmea',               // בדיקה טמאה 
  VESET = 'veset'                         // וסת
}

export interface EventDto {
  type: DayType | InputEventType,
  date: string;
  details: string[];
}

export enum Ona {
  OnaBenonit = 'עונה בינונית',
  VesetHahodesh = 'וסת החודש',
  Haflaga = 'הפלגה',
}
