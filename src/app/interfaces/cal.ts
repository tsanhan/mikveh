import { Approach } from "./approaches";

export type CalDay = { [date: string]: CalEvent[] };

export interface CalEvent {
  approach: Approach;
  hashashType: string;
  hebCalEvent: string; // like 7 cleanings, blood observed
  instructions: string
}
