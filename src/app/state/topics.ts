export interface Topic {
  name: string;
  src: string;
}

export interface Topics {
  [key: string]: Topic;
}
