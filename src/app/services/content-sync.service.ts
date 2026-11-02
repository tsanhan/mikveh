import { DestroyRef, inject, Injectable, NgZone, signal } from '@angular/core';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Storage } from '@ionic/storage-angular';
import { BehaviorSubject } from 'rxjs';
import bundledTopics from '../../assets/data/topics.json';
import { environment } from '../../environments/environment';
import { Topic } from '../interfaces/topics';
import {
  Advertisement, mediaPaths, mediaDataUrl, resolvedTopics, sha256, MEDIA_MAX_BYTES, MEDIA_TOTAL_BYTES,
  CachedContent, CONTENT_CACHE_KEY, CONTENT_CHECK_INTERVAL, CONTENT_CHECK_KEY,
  CONTENT_MAX_BYTES, CONTENT_TIMEOUT, isCachedContent, isContentBundle, isContentManifest,
} from '../utils/content-validation';
import { CONTENT_SOURCE, CONTENT_SYNC_ENABLED } from './content-source';

@Injectable({ providedIn: 'root' })
export class ContentSyncService {
  private readonly storage = inject(Storage);
  private readonly source = inject(CONTENT_SOURCE);
  private readonly enabled = inject(CONTENT_SYNC_ENABLED);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private readonly topics = new BehaviorSubject<Topic[]>(bundledTopics as Topic[]);
  readonly topics$ = this.topics.asObservable();
  private readonly ads = new BehaviorSubject<Advertisement[]>([]);
  readonly ads$ = this.ads.asObservable();
  readonly status = signal<'bundled' | 'cached' | 'updated' | 'unavailable'>('bundled');
  readonly checking = signal(false);
  readonly ready: Promise<void>;
  private cached?: CachedContent;
  private lastCheck = 0;
  private storageReady = false;
  private inFlight?: Promise<void>;

  constructor() {
    this.ready = this.loadLocal();
    // Cloud work never blocks the cache/calendar initialization or bundled content.
    void this.ready.then(() => this.refresh());
    if (this.enabled) this.listenForResume();
  }

  private async loadLocal(): Promise<void> {
    try {
      await this.storage.create();
      this.storageReady = true;
      const saved: unknown = await this.storage.get(CONTENT_CACHE_KEY);
      if (isCachedContent(saved)) {
        this.cached = saved;
        this.activate(saved);
        this.status.set('cached');
      }
      const checked: unknown = await this.storage.get(CONTENT_CHECK_KEY);
      if (typeof checked === 'number' && Number.isFinite(checked) && checked <= Date.now()) {
        this.lastCheck = checked;
      }
    } catch {
      // Storage can be unavailable or full. Bundled content remains usable.
    }
  }

  async refresh(force = false): Promise<void> {
    await this.ready;
    if (!this.enabled || !this.storageReady || !navigator.onLine) return;
    if (this.inFlight) return this.inFlight;
    if (!force && Date.now() - this.lastCheck < CONTENT_CHECK_INTERVAL) return;
    this.inFlight = this.check().finally(() => { this.inFlight = undefined; });
    return this.inFlight;
  }

  private async check(): Promise<void> {
    this.zone.run(() => this.checking.set(true));
    this.lastCheck = Date.now();
    try {
      await this.storage.set(CONTENT_CHECK_KEY, this.lastCheck);
      const manifest = await this.withTimeout(this.source.manifest());
      if (!isContentManifest(manifest)) throw new Error('Invalid content manifest');
      const release = manifest.content;
      // Hashes, not monotonically increasing versions: rollback is supported too.
      if (this.cached?.release.sha256 === release.sha256) return;
      const bytes = await this.withTimeout(this.source.download(release.path));
      if (bytes.byteLength > CONTENT_MAX_BYTES) throw new Error('Content exceeds size limit');
      const hash = await sha256(bytes);
      if (hash !== release.sha256) throw new Error('Content checksum mismatch');
      const bundle: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
      if (!isContentBundle(bundle)) throw new Error('Invalid content bundle');
      const paths = mediaPaths(bundle);
      if (paths.length * MEDIA_MAX_BYTES > MEDIA_TOTAL_BYTES) throw new Error('Too many images');
      const media: Record<string, string> = {};
      for (const path of paths) {
        if (this.cached?.media?.[path]) { media[path] = this.cached.media[path]; continue; }
        const image = await this.withTimeout(this.source.download(path));
        if (image.byteLength > MEDIA_MAX_BYTES || image.byteLength < 3 ||
          new Uint8Array(image)[0] !== 255 || new Uint8Array(image)[1] !== 216 ||
          await sha256(image) !== path.split('/').pop()!.slice(0, 64)) throw new Error('Invalid image');
        media[path] = mediaDataUrl(image);
      }
      const saved: CachedContent = { release, bundle, ...(paths.length ? { media } : {}) };
      // One complete record: failed downloads/writes cannot activate partial content.
      await this.storage.set(CONTENT_CACHE_KEY, saved);
      this.cached = saved;
      this.zone.run(() => {
        this.activate(saved);
        this.status.set('updated');
      });
    } catch (error) {
      if (!environment.production) console.warn('Content synchronization failed', error);
      this.zone.run(() => this.status.set('unavailable'));
    } finally {
      this.zone.run(() => this.checking.set(false));
    }
  }

  private activate(saved: CachedContent): void {
    this.topics.next(resolvedTopics(saved));
    this.ads.next((saved.bundle.ads ?? []).filter(ad => ad.enabled).map(ad =>
      ({ ...ad, image: saved.media![ad.image] })));
  }

  private async withTimeout<T>(work: Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        work,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Content request timed out')), CONTENT_TIMEOUT);
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  private listenForResume(): void {
    const online = () => { void this.refresh(); };
    const visible = () => { if (document.visibilityState === 'visible') void this.refresh(); };
    window.addEventListener('online', online);
    document.addEventListener('visibilitychange', visible);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('online', online);
      document.removeEventListener('visibilitychange', visible);
    });
    if (Capacitor.isNativePlatform()) {
      const listener = App.addListener('appStateChange', state => {
        if (state.isActive) void this.refresh();
      });
      this.destroyRef.onDestroy(() => { void listener.then(handle => handle.remove()).catch(() => {}); });
      void listener.catch(() => { /* Browser visibility/online events remain available. */ });
    }
  }
}
