export interface Topic {
  id: string;
  title: string;
  src: string;
  content: TopicContent[];
  subtitle: string;
}

export type TopicContent = {
  type: 'text' | 'img';
  data: string;
}



