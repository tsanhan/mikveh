export interface Approach {
  nameHeb:string;
  name:string;
  svg:string;
}

export interface Approaches {
  [key: string]: Approach;
}

export enum ApproachName {
  CHABAD = 'chabad',
  ASHKENAZI = 'ashkenaz',
  SEPHARDI = 'sfarad',
}

