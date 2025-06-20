import { Approach } from './approaches';

export type CalDay = { [date: string]: CalEvent[] };

export interface CalEvent {
  type: CalEventType;
  datetime: string;
}

export type CalEvents = {
  [date: string]: CalEvent[];
};

export enum CalEventType {
  SEE_BLOOD = 'see blood',
  OTHER = 'other',
}
