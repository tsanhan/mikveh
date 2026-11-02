import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { Storage } from '@ionic/storage-angular';
import bundledTopics from '../../assets/data/topics.json';
import { Topic } from '../interfaces/topics';
import {
  CachedContent, ContentBundle, ContentManifest, CONTENT_CACHE_KEY, CONTENT_CHECK_INTERVAL,
  CONTENT_CHECK_KEY, CONTENT_TIMEOUT, isContentBundle, mediaDataUrl, sha256,
} from '../utils/content-validation';
import { CONTENT_SOURCE, CONTENT_SYNC_ENABLED, ContentSource } from './content-source';
import { ContentSyncService } from './content-sync.service';

describe('ContentSyncService', () => {
  let values: Map<string, unknown>;
  let storage: jasmine.SpyObj<Storage>;
  let source: jasmine.SpyObj<ContentSource>;
  let bundle: ContentBundle;
  let bytes: ArrayBuffer;
  let manifest: ContentManifest;
  let online: boolean;

  beforeEach(async () => {
    online = true;
    spyOnProperty(navigator, 'onLine', 'get').and.callFake(() => online);
    bundle = { schemaVersion: 1, topics: structuredClone(bundledTopics) as Topic[] };
    bundle.topics[0].title = 'תוכן מעודכן';
    bytes = new TextEncoder().encode(JSON.stringify(bundle)).buffer;
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    manifest = { schemaVersion: 1, content: {
      version: 'revision-1', path: 'published/content/revision-1.json',
      sha256: Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join(''),
    } };
    values = new Map();
    storage = jasmine.createSpyObj<Storage>('Storage', ['create', 'get', 'set']);
    storage.create.and.resolveTo(storage);
    storage.get.and.callFake(async key => values.get(key));
    storage.set.and.callFake(async (key, value) => { values.set(key, value); return value; });
    source = jasmine.createSpyObj<ContentSource>('ContentSource', ['manifest', 'download']);
    source.manifest.and.resolveTo(manifest);
    source.download.and.resolveTo(bytes);
    TestBed.configureTestingModule({ providers: [
      { provide: Storage, useValue: storage },
      { provide: CONTENT_SOURCE, useValue: source },
      { provide: CONTENT_SYNC_ENABLED, useValue: true },
    ] });
  });

  function latest(service: ContentSyncService): () => Topic[] {
    let current: Topic[] = [];
    service.topics$.subscribe(topics => { current = topics; });
    return () => current;
  }

  function cached(): CachedContent {
    return { release: manifest.content, bundle };
  }

  it('immediately exposes the bundled JSON and works on first launch offline', async () => {
    online = false;
    const service = TestBed.inject(ContentSyncService);
    const topics = latest(service);
    expect(topics()).toEqual(bundledTopics as Topic[]);
    await service.ready;
    await service.refresh();
    expect(source.manifest).not.toHaveBeenCalled();
    expect(service.status()).toBe('bundled');
  });

  it('downloads, validates and persists a changed release before displaying it', async () => {
    const service = TestBed.inject(ContentSyncService);
    const topics = latest(service);
    await service.refresh();
    expect(source.download).toHaveBeenCalledOnceWith(manifest.content.path);
    expect(values.get(CONTENT_CACHE_KEY)).toEqual(cached());
    expect(topics()[0].title).toBe('תוכן מעודכן');
    expect(service.status()).toBe('updated');
  });

  it('restores downloaded content on a later offline launch', async () => {
    values.set(CONTENT_CACHE_KEY, cached());
    online = false;
    const service = TestBed.inject(ContentSyncService);
    const topics = latest(service);
    await service.ready;
    expect(topics()).toEqual(bundle.topics);
    expect(service.status()).toBe('cached');
    expect(source.download).not.toHaveBeenCalled();
  });

  it('does not download unchanged content, even when the revision label changes', async () => {
    values.set(CONTENT_CACHE_KEY, cached());
    source.manifest.and.resolveTo({ ...manifest, content: { ...manifest.content, version: 'another-label' } });
    const service = TestBed.inject(ContentSyncService);
    await service.refresh();
    expect(source.manifest).toHaveBeenCalledTimes(1);
    expect(source.download).not.toHaveBeenCalled();
  });

  it('throttles checks across launches and supports an explicit forced check', async () => {
    values.set(CONTENT_CHECK_KEY, Date.now());
    const service = TestBed.inject(ContentSyncService);
    await service.refresh();
    expect(source.manifest).not.toHaveBeenCalled();
    await service.refresh(true);
    await service.refresh();
    expect(source.manifest).toHaveBeenCalledTimes(1);
  });

  it('checks again after an hour and coalesces concurrent refreshes', async () => {
    values.set(CONTENT_CHECK_KEY, Date.now() - CONTENT_CHECK_INTERVAL);
    const service = TestBed.inject(ContentSyncService);
    await Promise.all([service.refresh(), service.refresh(), service.refresh(true)]);
    expect(source.manifest).toHaveBeenCalledTimes(1);
    expect(source.download).toHaveBeenCalledTimes(1);
  });

  it('keeps cached content on missing or inaccessible Firebase content', async () => {
    const previous = cached();
    values.set(CONTENT_CACHE_KEY, previous);
    source.manifest.and.rejectWith(new Error('permission-denied'));
    const service = TestBed.inject(ContentSyncService);
    const topics = latest(service);
    await service.refresh();
    expect(topics()).toEqual(previous.bundle.topics);
    expect(values.get(CONTENT_CACHE_KEY)).toBe(previous);
    expect(service.status()).toBe('unavailable');
  });

  for (const invalid of [undefined, { schemaVersion: 2, content: {} }, {
    schemaVersion: 1, content: { version: 'x', path: 'private/secret.json', sha256: 'a'.repeat(64) },
  }]) {
    it('rejects a missing, unsupported or unsafe manifest', async () => {
      source.manifest.and.resolveTo(invalid);
      const service = TestBed.inject(ContentSyncService);
      await service.refresh();
      expect(source.download).not.toHaveBeenCalled();
      expect(values.has(CONTENT_CACHE_KEY)).toBeFalse();
    });
  }

  it('rejects interrupted downloads and checksum mismatches without overwriting the cache', async () => {
    source.download.and.resolveTo(new TextEncoder().encode('{}').buffer);
    const service = TestBed.inject(ContentSyncService);
    const topics = latest(service);
    await service.refresh();
    expect(topics()).toEqual(bundledTopics as Topic[]);
    expect(values.has(CONTENT_CACHE_KEY)).toBeFalse();
    source.download.and.rejectWith(new Error('interrupted'));
    await service.refresh(true);
    expect(values.has(CONTENT_CACHE_KEY)).toBeFalse();
  });

  it('does not activate a release when local persistence fails', async () => {
    storage.set.and.callFake(async (key, value) => {
      if (key === CONTENT_CACHE_KEY) throw new Error('quota exceeded');
      values.set(key, value);
      return value;
    });
    const service = TestBed.inject(ContentSyncService);
    const topics = latest(service);
    await service.refresh();
    expect(topics()).toEqual(bundledTopics as Topic[]);
    expect(service.status()).toBe('unavailable');
  });

  it('rejects structurally invalid JSON even when its checksum matches', async () => {
    const invalid = { schemaVersion: 1, topics: bundle.topics.slice(1) };
    const invalidBytes = new TextEncoder().encode(JSON.stringify(invalid)).buffer;
    const digest = await crypto.subtle.digest('SHA-256', invalidBytes);
    manifest.content.sha256 = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    source.download.and.resolveTo(invalidBytes);
    const service = TestBed.inject(ContentSyncService);
    const topics = latest(service);
    await service.refresh();
    expect(topics()).toEqual(bundledTopics as Topic[]);
    expect(values.has(CONTENT_CACHE_KEY)).toBeFalse();
  });

  it('keeps the bundled fallback when storage initialization fails', async () => {
    storage.create.and.rejectWith(new Error('storage unavailable'));
    const service = TestBed.inject(ContentSyncService);
    const topics = latest(service);
    await service.refresh();
    expect(topics()).toEqual(bundledTopics as Topic[]);
    expect(source.manifest).not.toHaveBeenCalled();
  });

  it('ignores corrupt local content and repairs it with a valid download', async () => {
    values.set(CONTENT_CACHE_KEY, { release: manifest.content, bundle: {} });
    const service = TestBed.inject(ContentSyncService);
    await service.refresh();
    expect(values.get(CONTENT_CACHE_KEY)).toEqual(cached());
  });

  it('accepts rollback to an older revision with a different hash', async () => {
    values.set(CONTENT_CACHE_KEY, { ...cached(), release: { ...manifest.content, version: 'newer', sha256: '0'.repeat(64) } });
    const service = TestBed.inject(ContentSyncService);
    await service.refresh();
    expect(source.download).toHaveBeenCalledTimes(1);
    expect(values.get(CONTENT_CACHE_KEY)).toEqual(cached());
  });

  it('leaves Firebase untouched when sync is disabled', async () => {
    TestBed.overrideProvider(CONTENT_SYNC_ENABLED, { useValue: false });
    const service = TestBed.inject(ContentSyncService);
    await service.refresh(true);
    expect(source.manifest).not.toHaveBeenCalled();
  });

  it('times out without letting a late response replace content', fakeAsync(() => {
    let resolve!: (value: unknown) => void;
    source.manifest.and.returnValue(new Promise(done => { resolve = done; }));
    const service = TestBed.inject(ContentSyncService);
    flushMicrotasks();
    tick(CONTENT_TIMEOUT);
    flushMicrotasks();
    expect(service.status()).toBe('unavailable');
    resolve(manifest);
    flushMicrotasks();
    expect(source.download).not.toHaveBeenCalled();
    expect(values.has(CONTENT_CACHE_KEY)).toBeFalse();
  }));

  async function addImage(): Promise<string> {
    const image = new Uint8Array([255, 216, 255, 217]).buffer;
    const path = `published/media/${await sha256(image)}.jpg`;
    bundle.topics[0].content['chabad'].push({ type: 'img', data: path });
    bundle.ads = [{ id: 'banner', image: path, enabled: true }];
    bytes = new TextEncoder().encode(JSON.stringify(bundle)).buffer;
    manifest.content.sha256 = await sha256(bytes);
    source.download.and.callFake(async requested => requested === path ? image : bytes);
    return path;
  }

  it('downloads shared media once and restores content images and ads offline', async () => {
    const path = await addImage();
    const service = TestBed.inject(ContentSyncService);
    const topics = latest(service);
    let ads: { image: string }[] = [];
    service.ads$.subscribe(value => { ads = value; });
    await service.refresh();
    expect(source.download.calls.allArgs().filter(args => args[0] === path).length).toBe(1);
    const saved = values.get(CONTENT_CACHE_KEY) as CachedContent;
    expect(saved.media![path]).toBe(mediaDataUrl(new Uint8Array([255, 216, 255, 217]).buffer));
    expect(topics()[0].content['chabad'].slice(-1)[0].data).toBe(saved.media![path]);
    expect(ads[0].image).toBe(saved.media![path]);
    expect(saved.bundle.topics[0].content['chabad'].slice(-1)[0].data).toBe(path);
    source.download.calls.reset(); online = false;
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [
      { provide: Storage, useValue: storage }, { provide: CONTENT_SOURCE, useValue: source },
      { provide: CONTENT_SYNC_ENABLED, useValue: true },
    ] });
    const offline = TestBed.inject(ContentSyncService); const restored = latest(offline);
    await offline.ready;
    expect(restored()[0].content['chabad'].slice(-1)[0].data).toBe(saved.media![path]);
    expect(source.download).not.toHaveBeenCalled();
  });

  it('keeps the complete previous release if a required image cannot be downloaded', async () => {
    const previous = cached(); values.set(CONTENT_CACHE_KEY, structuredClone(previous));
    const path = await addImage();
    source.download.and.callFake(async requested => {
      if (requested === path) throw new Error('missing image');
      return bytes;
    });
    const service = TestBed.inject(ContentSyncService); const topics = latest(service);
    await service.refresh();
    expect(service.status()).toBe('unavailable');
    expect(topics()[0].content['chabad'].some(block => block.type === 'img')).toBeFalse();
    expect((values.get(CONTENT_CACHE_KEY) as CachedContent).bundle.ads).toBeUndefined();
  });

  it('reuses an existing cached image when text changes', async () => {
    const path = await addImage();
    values.set(CONTENT_CACHE_KEY, { ...cached(), release: { ...manifest.content, sha256: 'a'.repeat(64) },
      media: { [path]: mediaDataUrl(new Uint8Array([255, 216, 255, 217]).buffer) } });
    const service = TestBed.inject(ContentSyncService);
    await service.refresh();
    expect(source.download).toHaveBeenCalledOnceWith(manifest.content.path);
  });

  it('rejects remote URLs and malformed advertisements', () => {
    bundle.topics[0].content['chabad'].push({ type: 'img', data: 'https://example.com/tracker.svg' });
    expect(isContentBundle(bundle)).toBeFalse();
    bundle.topics[0].content['chabad'].pop();
    bundle.ads = [{ id: 'ad', image: 'assets/fake.jpg', enabled: true }];
    expect(isContentBundle(bundle)).toBeFalse();
  });

  it('validates all three approaches, IDs, block types and rectangular tables', () => {
    expect(isContentBundle(bundle)).toBeTrue();
    const invalid = structuredClone(bundle);
    invalid.topics[0].content['chabad'] = [{ type: 'table', data: [['a', 'b'], ['c']] }];
    expect(isContentBundle(invalid)).toBeFalse();
    invalid.topics[0].content['chabad'] = [{ type: 'text', data: 'ok' }];
    delete invalid.topics[0].content['sfarad_ovadia'];
    expect(isContentBundle(invalid)).toBeFalse();
    invalid.topics = bundle.topics.slice(1);
    expect(isContentBundle(invalid)).toBeFalse();
  });
});
