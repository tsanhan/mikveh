
export interface CalEvent {
  type: CalEventType;
  hDateSunsetAwareString: string;
  afterSunset: boolean;
}



export enum CalEventType {
  SEE_BLOOD = 'blood',
  OTHER = 'other',
}
