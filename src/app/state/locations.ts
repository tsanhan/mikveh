export interface Location {
  name: string;
  latitude: number;
  longitude: number;
  elevation: number;
  timeZoneId: string;
}

export interface Locations {
  [key: string]: Location;
}
