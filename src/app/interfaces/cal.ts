import { NgbDateStruct } from "@ng-bootstrap/ng-bootstrap";

export interface CalEventDict {
  [hebYear: number]: {
    [hebMonth: number]: {
      [hebDay: number]: OutputEvent[];
    }
  }
}

export interface CachedCalEvent {
  type: InputEventType;
  hDateSunsetAwareString: string;
  gregorianDateString: string; // for easier debugging
  afterSunset: boolean;
}

export interface OutputEvent {
  simpleDate: Date;
  date: NgbDateStruct;
  outputEventType: DayType | InputEventType;
  ona?: InputEventOna;
  CachedInputEventRef: CachedInputEvent;
  details: string[];
}


export interface CachedInputEvent {
  simpleDate: Date;
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
}

export enum InputEventOna {
  YOM = 'yom',
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

