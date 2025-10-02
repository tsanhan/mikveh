import { Approach } from "./approaches";

export interface CachedCalEvent {
  type: InputEventType;
  hDateSunsetAwareString: string;
  gregorianDateString: string; // for easier debugging
  afterSunset: boolean;
}

export enum InputEventType {
  SEE_BLOOD = 'seeBlood',
  HEFSEK_TAHARA = 'hefsekTahara',
  KETEM = 'ketem',
}

export enum DayType {
  MAHZOR = 'mahzor',
  CAN_START_CHECK_HEFSEK = 'canStartHefsek',
  SEVEN_CLEAN = 'sevenCleans',
  MIKVEH_DAY = 'mikvehDay',
  MUTERET = 'muteret',
  PRISHA = 'prisha',
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

