import { inject, Injectable, InjectionToken, Injector, runInInjectionContext } from '@angular/core';
import { doc, Firestore, getDocFromServer, runTransaction } from '@angular/fire/firestore';
import { getBytes, ref, Storage, uploadBytes } from '@angular/fire/storage';
import { ContentBundle, ContentRelease, CONTENT_MAX_BYTES, isContentBundle, isContentManifest,
  mediaPaths, MEDIA_MAX_BYTES, MEDIA_TOTAL_BYTES, sha256 } from '../utils/content-validation';

export interface AdminContentApi {
  manifest(): Promise<unknown>;
  download(path: string): Promise<ArrayBuffer>;
  upload(path: string, bytes: ArrayBuffer, mime: string): Promise<void>;
  publish(base: string, release: ContentRelease): Promise<void>;
}
export const ADMIN_CONTENT_API = new InjectionToken<AdminContentApi>('AdminContentApi', {
  providedIn: 'root', factory: () => {
    const injector = inject(Injector);
    const firestore = inject(Firestore);
    const storage = inject(Storage);
    return {
      manifest: () => runInInjectionContext(injector, async () =>
        (await getDocFromServer(doc(firestore, 'appContent/current'))).data()),
      download: path => runInInjectionContext(injector, () => getBytes(ref(storage, path), CONTENT_MAX_BYTES)),
      upload: (path, bytes, mime) => runInInjectionContext(injector, async () => {
        await uploadBytes(ref(storage, path), bytes, { contentType: mime, cacheControl: 'public,max-age=31536000,immutable' });
      }),
      publish: (base, release) => runInInjectionContext(injector, () => runTransaction(firestore, async transaction => {
        const current = doc(firestore, 'appContent/current');
        const manifest = (await transaction.get(current)).data();
        if (!isContentManifest(manifest) || manifest.content.sha256 !== base)
          throw new Error('conflict');
        transaction.set(current, { schemaVersion: 1, content: release });
      })),
    };
  },
});

@Injectable({ providedIn: 'root' })
export class AdminContentService {
  private readonly api = inject(ADMIN_CONTENT_API);

  async load(): Promise<{ release: ContentRelease; bundle: ContentBundle }> {
    const manifest = await this.api.manifest();
    if (!isContentManifest(manifest)) throw new Error('invalid-manifest');
    const bytes = await this.api.download(manifest.content.path);
    if (bytes.byteLength > CONTENT_MAX_BYTES || await sha256(bytes) !== manifest.content.sha256)
      throw new Error('invalid-checksum');
    const bundle: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (!isContentBundle(bundle)) throw new Error('invalid-content');
    return { release: manifest.content, bundle };
  }

  async publish(base: string, bundle: ContentBundle): Promise<ContentRelease> {
    if (!isContentBundle(bundle) || mediaPaths(bundle).length * MEDIA_MAX_BYTES > MEDIA_TOTAL_BYTES)
      throw new Error('invalid-content');
    // Fail early on a stale draft; transaction repeats this check after upload.
    const current = await this.api.manifest();
    if (!isContentManifest(current) || current.content.sha256 !== base) throw new Error('conflict');
    const bytes = new TextEncoder().encode(JSON.stringify(bundle)).buffer;
    if (bytes.byteLength > CONTENT_MAX_BYTES) throw new Error('content-too-large');
    const hash = await sha256(bytes);
    if (hash === base) return current.content;
    const version = `${Date.now()}-${crypto.randomUUID()}`;
    const release = { version, path: `published/content/${version}.json`, sha256: hash };
    await this.api.upload(release.path, bytes, 'application/json');
    await this.api.publish(base, release);
    return release;
  }

  async image(file: File): Promise<{ path: string; preview: string }> {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024)
      throw new Error('image-format');
    const bitmap = await createImageBitmap(file);
    try {
      if (bitmap.width * bitmap.height > 40_000_000) throw new Error('image-too-large');
      const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d')!;
      context.fillStyle = 'white'; context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value =>
        value ? resolve(value) : reject(new Error('image-format')), 'image/jpeg', 0.8));
      if (blob.size > MEDIA_MAX_BYTES) throw new Error('image-too-large');
      const bytes = await blob.arrayBuffer();
      const path = `published/media/${await sha256(bytes)}.jpg`;
      try {
        const existing = await this.api.download(path);
        if (await sha256(existing) !== await sha256(bytes)) throw new Error('invalid-image');
      } catch (error) {
        if ((error as { code?: string }).code !== 'storage/object-not-found') throw error;
        try { await this.api.upload(path, bytes, 'image/jpeg'); }
        catch (uploadError) {
          // A second administrator may have uploaded the exact same immutable image.
          if (await sha256(await this.api.download(path)) !== await sha256(bytes)) throw uploadError;
        }
      }
      return { path, preview: URL.createObjectURL(blob) };
    } finally { bitmap.close(); }
  }

  async preview(path: string): Promise<string> {
    const bytes = await this.api.download(path);
    if (bytes.byteLength > MEDIA_MAX_BYTES || await sha256(bytes) !== path.split('/').pop()!.slice(0, 64))
      throw new Error('invalid-image');
    return URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }));
  }
}
