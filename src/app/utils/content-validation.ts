import requiredIds from '../../assets/data/content-topic-ids.json';
import { ApproachName } from '../interfaces/approaches';
import { Topic, TopicContent } from '../interfaces/topics';

export const CONTENT_MAX_BYTES = 2 * 1024 * 1024;
export const CONTENT_CACHE_KEY = 'publishedContent.v1';
export const CONTENT_CHECK_KEY = 'publishedContent.lastCheck';
export const CONTENT_CHECK_INTERVAL = 60 * 60 * 1000;
export const CONTENT_TIMEOUT = 15_000;

export interface ContentRelease {
  version: string;
  path: string;
  sha256: string;
}
export interface ContentManifest {
  schemaVersion: 1;
  content: ContentRelease;
}
export const MEDIA_MAX_BYTES = 512 * 1024;
export const MEDIA_TOTAL_BYTES = 6 * 1024 * 1024;
export interface Advertisement { id: string; image: string; enabled: boolean; }

export function isMediaPath(value: unknown): value is string {
  return typeof value === 'string' && /^published\/media\/[a-f0-9]{64}\.jpg$/.test(value);
}

export interface ContentBundle {
  schemaVersion: 1;
  topics: Topic[];
  ads?: Advertisement[];
}
export interface CachedContent {
  release: ContentRelease;
  bundle: ContentBundle;
  media?: Record<string, string>;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isContentRelease(value: unknown): value is ContentRelease {
  return record(value) && typeof value['version'] === 'string' &&
    value['version'].length > 0 && value['version'].length <= 128 &&
    typeof value['path'] === 'string' &&
    /^published\/content\/[a-zA-Z0-9_-]+\.json$/.test(value['path']) &&
    typeof value['sha256'] === 'string' && /^[a-f0-9]{64}$/.test(value['sha256']);
}

export function isContentManifest(value: unknown): value is ContentManifest {
  return record(value) && value['schemaVersion'] === 1 && isContentRelease(value['content']);
}

function isBlock(value: unknown): value is TopicContent {
  if (!record(value)) return false;
  const only = value['onlyApproaches'];
  if (only !== undefined && (!Array.isArray(only) ||
      !only.every(id => Object.values(ApproachName).includes(id)))) return false;
  const data = value['data'];
  switch (value['type']) {
    case 'text': case 'bold': case 'headline': return typeof data === 'string';
    case 'img': return isMediaPath(data) || (typeof data === 'string' &&
      /^assets\/[a-zA-Z0-9_./-]+$/.test(data) && !data.includes('..'));
    case 'table': return Array.isArray(data) && data.length > 0 &&
      data.every(row => Array.isArray(row) && row.length > 0 &&
        row.length === data[0].length && row.every(cell => typeof cell === 'string'));
    default: return false;
  }
}

export function isContentBundle(value: unknown): value is ContentBundle {
  if (!record(value) || value['schemaVersion'] !== 1 || !Array.isArray(value['topics'])) return false;
  const ads = value['ads'];
  if (ads !== undefined && (!Array.isArray(ads) || ads.length > 10 ||
    new Set(ads.map(ad => ad?.id)).size !== ads.length || !ads.every(ad => record(ad) &&
      typeof ad['id'] === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(ad['id']) &&
      isMediaPath(ad['image']) && typeof ad['enabled'] === 'boolean'))) return false;
  const topics = value['topics'];

  // Keep calendar/navigation targets and all three approaches intact in the MVP.
  return topics.length === requiredIds.length &&
    new Set(topics.map(topic => topic?.id)).size === requiredIds.length &&
    topics.every((topic, index) => record(topic) && requiredIds[index] === topic['id'] &&
      typeof topic['title'] === 'string' && topic['title'].trim().length > 0 &&
      typeof topic['subtitle'] === 'string' && typeof topic['src'] === 'string' &&
      (topic['shortTitle'] === undefined || typeof topic['shortTitle'] === 'string') &&
      record(topic['content']) && Object.keys(topic['content']).length === 3 && Object.values(ApproachName).every(id => {
        const blocks = (topic['content'] as Record<string, unknown>)[id];
        return Array.isArray(blocks) && blocks.length > 0 && blocks.every(isBlock);
      }));
}

export function isCachedContent(value: unknown): value is CachedContent {
  if (!record(value) || !isContentRelease(value['release']) || !isContentBundle(value['bundle'])) return false;
  const media = value['media'];
  const paths = mediaPaths(value['bundle']);
  if (paths.length * MEDIA_MAX_BYTES > MEDIA_TOTAL_BYTES) return false;
  return paths.length === 0 || (record(media) && paths.every(path =>
    typeof media[path] === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(media[path] as string) &&
    (media[path] as string).length <= MEDIA_MAX_BYTES * 1.34 + 50));
}

export function mediaPaths(bundle: ContentBundle): string[] {
  const paths = bundle.topics.flatMap(topic => Object.values(topic.content).flat()
    .filter(block => block.type === 'img' && isMediaPath(block.data)).map(block => block.data as string));
  paths.push(...(bundle.ads ?? []).map(ad => ad.image));
  return [...new Set(paths)];
}

export async function sha256(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export function mediaDataUrl(bytes: ArrayBuffer): string {
  let binary = '';
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return 'data:image/jpeg;base64,' + btoa(binary);
}

export function resolvedTopics(saved: CachedContent): Topic[] {
  const topics = structuredClone(saved.bundle.topics);
  for (const topic of topics) for (const blocks of Object.values(topic.content))
    for (const block of blocks) if (block.type === 'img' && isMediaPath(block.data))
      block.data = saved.media![block.data];
  return topics;
}
