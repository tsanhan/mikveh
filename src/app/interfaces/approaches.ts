export interface Approach {
  nameHeb:string;
  name:string;
  svg:string;
  contentKey?: string;
}

export interface Approaches {
  [key: string]: Approach;
}

export enum ApproachName {
  CHABAD = 'chabad',
  SEPHARDI_OVADIA = 'sfarad_ovadia',
  SEPHARDI_MORDECHAI_ELIYAHU = 'sfarad_mordechai_eliyahu',
}
