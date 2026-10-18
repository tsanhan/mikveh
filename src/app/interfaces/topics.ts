export interface Topic {
  id: string;
  title: string;
  src: string;
  content: Content;
  subtitle: string;
}

export type Content = { [approach: string]: TopicContent[] };

export type TopicContent = ({
  type: 'text' | 'img' | 'bold' | 'headline';
  data: string;
} | {
  type: 'table';
  data: string[][];
}) & {
  onlyApproaches?: string[];
};
