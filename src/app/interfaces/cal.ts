export type CalDay = { [date: string]: GishaCalDay[] };

export type GishaCalDay = { [gisha: string]: CalEvent[] };

export interface CalEvent {
  hashashType: string;
  event: string;
  instractions: string[]
}
