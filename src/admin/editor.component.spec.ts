import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import bundledTopics from '../assets/data/topics.json';
import { Topic } from '../app/interfaces/topics';
import { AdminContentService } from '../app/admin/admin-content.service';
import { AdminAuthService } from '../app/admin/admin-auth.service';
import { ContentBundle } from '../app/utils/content-validation';
import { EditorComponent } from './editor.component';

describe('Simple admin editor', () => {
  let store: Map<string, string>;
  let service: jasmine.SpyObj<AdminContentService>;
  let email: ReturnType<typeof signal<string>>;
  const key = 'mikveh-admin-draft.v1.rubinshai@gmail.com';
  beforeEach(() => {
    store = new Map(); email = signal('rubinshai@gmail.com');
    spyOn(localStorage, 'getItem').and.callFake(name => store.get(name) ?? null);
    spyOn(localStorage, 'setItem').and.callFake((name, value) => store.set(name, value));
    spyOn(localStorage, 'removeItem').and.callFake(name => store.delete(name));
    service = jasmine.createSpyObj<AdminContentService>('content', ['load', 'publish', 'preview', 'image']);
    const bundle: ContentBundle = { schemaVersion: 1, topics: structuredClone(bundledTopics) as Topic[] };
    service.load.and.resolveTo({ release: { version: 'current', path: 'published/content/current.json', sha256: 'a'.repeat(64) }, bundle });
    TestBed.configureTestingModule({ imports: [EditorComponent], providers: [
      { provide: AdminContentService, useValue: service }, { provide: AdminAuthService, useValue: { email } },
    ] });
  });
  async function open() {
    const fixture = TestBed.createComponent(EditorComponent);
    await fixture.whenStable(); fixture.detectChanges();
    return fixture;
  }
  it('shows one save action without draft/restore/export controls', async () => {
    const fixture = await open();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('שמירת השינויים');
    expect(text).not.toContain('טיוטה'); expect(text).not.toContain('גיבוי'); expect(text).not.toContain('שחזור');
    expect(fixture.nativeElement.querySelectorAll('select').length).toBe(1); // Shared introduction.
  });
  it('automatically preserves edits and restores them after a reload', async () => {
    const first = await open(); first.componentInstance.topic.title = 'עריכה מקומית'; first.componentInstance.change();
    expect(store.has(key)).toBeTrue(); first.destroy();
    const reopened = await open();
    expect(reopened.componentInstance.topic.title).toBe('עריכה מקומית');
    expect(reopened.componentInstance.dirty).toBeTrue();
    expect(service.publish).not.toHaveBeenCalled();
  });
  it('updates shared introduction text for all approaches', async () => {
    const fixture = await open(); const editor = fixture.componentInstance;
    editor.blocks[0].data = 'מבוא ערוך'; editor.change();
    for (const approach of editor.approaches)
      expect(editor.topic.content[approach.id][0].data).toBe('מבוא ערוך');
  });
  it('keeps stale local edits visible but blocks saving over a newer server version', async () => {
    const original = (await service.load()).bundle;
    store.set(key, JSON.stringify({ base: 'b'.repeat(64), bundle: original }));
    const fixture = await open(); const editor = fixture.componentInstance;
    expect(editor.conflict()).toBeTrue();
    await editor.publish(); expect(service.publish).not.toHaveBeenCalled();
  });
  it('retains local edits after a save failure and clears them only on success', async () => {
    const fixture = await open(); const editor = fixture.componentInstance;
    editor.topic.title = 'עדכון'; editor.change();
    service.publish.and.rejectWith(new Error('network'));
    await editor.publish(); expect(store.has(key)).toBeTrue(); expect(editor.dirty).toBeTrue();
    service.publish.and.resolveTo({ version: 'new', path: 'published/content/new.json', sha256: 'c'.repeat(64) });
    await editor.publish(); expect(store.has(key)).toBeFalse(); expect(editor.dirty).toBeFalse();
  });
  it('keeps temporary edits scoped to the account that opened the editor', async () => {
    const fixture = await open(); const editor = fixture.componentInstance;
    email.set('770ganani@gmail.com'); editor.topic.title = 'עדכון'; editor.change();
    expect(store.has(key)).toBeTrue();
    expect(store.has('mikveh-admin-draft.v1.770ganani@gmail.com')).toBeFalse();
  });
});
