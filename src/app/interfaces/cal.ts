import { NgbDateStruct } from "@ng-bootstrap/ng-bootstrap";
import { Approach } from "./approaches";

export interface CalEvent {
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
  inputEventType: InputEventType;
  outputEventType: DayType;
  ona: InputEventOna;
  specificType: InputSpecificEventType;
  CachedInputEventRef: CachedInputEvent;
  details: string[];
}


export interface CachedInputEvent {
  simpleDate: Date;
  date: NgbDateStruct;
  type: InputEventType;
  ona: InputEventOna;
  specificType: InputSpecificEventType;
}

export enum DayType {
  MAHZOR = 'mahzor',
  CAN_START_CHECK_HEFSEK = 'canStartHefsek',
  SEVEN_CLEAN = 'sevenCleans',
  MIKVEH_DAY = 'mikvehDay',
  MUTERET = 'muteret',
  PRISHA = 'prisha',
}

export enum InputEventOna {
  YOM = 'yom',
  LAYLA = 'layla'
}

export enum InputEventType {
  HEFSEK_TAHARA = 'hefsekTahara',
  REIYA = 'reiya',
}

export enum InputSpecificEventType {
  KETEM_TAME = 'ketemTame',
  BDIKA_TMEA = 'bdikaTmea',
  VESET = 'veset',
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

