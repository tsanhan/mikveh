export interface Topic {
  id: string;
  title: string;
  src: string;
  content: Content;
  subtitle: string;
}

export type Content = { [approach: string]: TopicContent[] };

export type TopicContent = {
  type: 'text' | 'img';
  data: string;
};
