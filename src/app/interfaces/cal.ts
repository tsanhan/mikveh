import { Approach } from "./approaches";

export interface CalEvent {
  type: CalEventType;
  hDateSunsetAwareString: string;
  afterSunset: boolean;
}



export enum CalEventType {
  SEE_BLOOD = 'blood',
  OTHER = 'other',
}


export interface EventDto {
  date: string;
  textColor: string;
  backgroundColor: string,
  details: string[]
  approach: Approach;
  ona: Ona
}

export enum Ona {
  OnaBenonit = 'עונה בינונית',

}

