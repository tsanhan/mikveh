import { Approach } from "./approaches";

export interface CalEvent {
  type: CalEventType;
  hDateSunsetAwareString: string;
  afterSunset: boolean;
}



export enum CalEventType {
  SEE_BLOOD = 'blood',
  BETWEEN_BLOOD_AND_HEFSEK='blood to hefsek',
  SEVEN_CLEAN='seven cleans',
  MIKVEH_DAY='mikveh day',
  BETWEEN_MIKVEH_DAY_AND_PRISHA='mikveh to prisha',
  OTHER = 'other',
}


export interface EventDto {
  type: CalEventType,
  date: string;
  textColor: string;
  border: string;
  backgroundColor: string;
  details: string[];
  approach: Approach;
  ona: Ona;
}

export enum Ona {
  OnaBenonit = 'עונה בינונית',
  Clali = 'כללי'

}

