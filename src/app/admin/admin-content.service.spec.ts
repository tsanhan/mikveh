import { TestBed } from '@angular/core/testing';
import bundledTopics from '../../assets/data/topics.json';
import { Topic } from '../interfaces/topics';
import { ContentBundle, ContentManifest, sha256 } from '../utils/content-validation';
import { ADMIN_CONTENT_API, AdminContentApi, AdminContentService } from './admin-content.service';

describe('AdminContentService', () => {
  let api: jasmine.SpyObj<AdminContentApi>;
  let bundle: ContentBundle;
  let manifest: ContentManifest;
  let bytes: ArrayBuffer;
  let service: AdminContentService;
  beforeEach(async () => {
    bundle = { schemaVersion: 1, topics: structuredClone(bundledTopics) as Topic[] };
    bytes = new TextEncoder().encode(JSON.stringify(bundle)).buffer;
    manifest = { schemaVersion: 1, content: { version: 'original', path: 'published/content/original.json', sha256: await sha256(bytes) } };
    api = jasmine.createSpyObj<AdminContentApi>('api', ['manifest', 'download', 'upload', 'publish']);
    api.manifest.and.resolveTo(manifest); api.download.and.resolveTo(bytes);
    api.upload.and.resolveTo(); api.publish.and.resolveTo();
    TestBed.configureTestingModule({ providers: [{ provide: ADMIN_CONTENT_API, useValue: api }] });
    service = TestBed.inject(AdminContentService);
  });
  it('loads and verifies the currently published bundle', async () => {
    expect(await service.load()).toEqual({ release: manifest.content, bundle });
    api.download.and.resolveTo(new TextEncoder().encode('{}').buffer);
    await expectAsync(service.load()).toBeRejectedWithError('invalid-checksum');
  });
  it('uploads an immutable complete bundle before atomically changing the pointer', async () => {
    bundle.topics[0].title = 'עריכה';
    const release = await service.publish(manifest.content.sha256, bundle);
    const uploaded = api.upload.calls.mostRecent().args;
    expect(uploaded[0]).toBe(release.path);
    expect(await sha256(uploaded[1])).toBe(release.sha256);
    expect(JSON.parse(new TextDecoder().decode(uploaded[1]))).toEqual(bundle);
    expect(api.publish).toHaveBeenCalledOnceWith(manifest.content.sha256, release);
    expect(api.upload).toHaveBeenCalledBefore(api.publish);
  });
  it('rejects a stale draft before uploading any files', async () => {
    await expectAsync(service.publish('a'.repeat(64), bundle)).toBeRejectedWithError('conflict');
    expect(api.upload).not.toHaveBeenCalled(); expect(api.publish).not.toHaveBeenCalled();
  });
  it('preserves a concurrent publication detected by the final transaction', async () => {
    bundle.topics[0].title = 'עריכה'; api.publish.and.rejectWith(new Error('conflict'));
    await expectAsync(service.publish(manifest.content.sha256, bundle)).toBeRejectedWithError('conflict');
    expect(api.upload).toHaveBeenCalledTimes(1);
  });
  it('does not publish a pointer when uploading fails', async () => {
    bundle.topics[0].title = 'עריכה'; api.upload.and.rejectWith(new Error('network'));
    await expectAsync(service.publish(manifest.content.sha256, bundle)).toBeRejected();
    expect(api.publish).not.toHaveBeenCalled();
  });
  it('skips an unchanged publication and rejects invalid content', async () => {
    expect(await service.publish(manifest.content.sha256, bundle)).toEqual(manifest.content);
    expect(api.upload).not.toHaveBeenCalled();
    bundle.topics.pop();
    await expectAsync(service.publish(manifest.content.sha256, bundle)).toBeRejectedWithError('invalid-content');
  });
  it('rejects HTML/SVG uploads without sending any data', async () => {
    await expectAsync(service.image(new File(['<svg/>'], 'test.svg', { type: 'image/svg+xml' }))).toBeRejectedWithError('image-format');
    expect(api.upload).not.toHaveBeenCalled();
  });
  it('resizes a real image, re-encodes JPEG and uploads it by content hash', async () => {
    const canvas = document.createElement('canvas'); canvas.width = 1600; canvas.height = 200;
    const png = await new Promise<Blob>(resolve => canvas.toBlob(blob => resolve(blob!), 'image/png'));
    api.download.and.rejectWith({ code: 'storage/object-not-found' });
    const image = await service.image(new File([png], 'test.png', { type: 'image/png' }));
    const args = api.upload.calls.mostRecent().args;
    expect(args[2]).toBe('image/jpeg'); expect(args[0]).toBe(`published/media/${await sha256(args[1])}.jpg`);
    const bitmap = await createImageBitmap(new Blob([args[1]]));
    expect(bitmap.width).toBe(1200); expect(bitmap.height).toBe(150);
    bitmap.close(); URL.revokeObjectURL(image.preview);
  });
});
