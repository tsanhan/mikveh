import { Approach } from "./approaches";

export interface CachedCalEvent {
  type: InputEventType;
  hDateSunsetAwareString: string;
  gregorianDateString: string; // for easier debugging
  afterSunset: boolean;
}

export enum InputEventType {
  SEE_BLOOD = 'see blood',
  HEFSEK_TAHARA = 'hefsek tahara',
}

export enum DayType {
  MAAYAN_PATUAH = 'maayan patuach',
  CAN_START_CHECK_HEFSEK = 'can start hefsek',
  SEVEN_CLEAN = 'seven cleans',
  MIKVEH_DAY = 'mikveh day',
  MUTERET = 'muteret',
  PRISHA = 'prisha',
}

export interface EventDto {
  type: DayType | InputEventType,
  date: string;
  textColor: string;
  border: string;
  backgroundColor: string;
  details: string[];
}

export enum Ona {
  OnaBenonit = 'עונה בינונית',
  VesetHahodesh = 'וסת החודש',
  Haflaga = 'הפלגה',
}

