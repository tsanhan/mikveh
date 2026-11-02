import { Component, HostListener, inject, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminContentService } from '../app/admin/admin-content.service';
import { AdminAuthService } from '../app/admin/admin-auth.service';
import { ContentBundle, isContentBundle, mediaPaths, isMediaPath } from '../app/utils/content-validation';

@Component({ selector: 'app-content-editor', imports: [FormsModule], templateUrl: './editor.component.html' })
export class EditorComponent implements OnDestroy {
  private readonly service = inject(AdminContentService);
  private readonly auth = inject(AdminAuthService);
  readonly busy = signal(false);
  readonly message = signal('');
  readonly error = signal('');
  readonly conflict = signal(false);
  bundle?: ContentBundle;
  base = '';
  dirty = false;
  saved = false;
  topicIndex = 0;
  approach = 'chabad';
  tab: 'content' | 'ads' = 'content';
  previews: Record<string, string> = {};
  readonly approaches = [ { id: 'chabad', title: 'חב״ד' }, { id: 'sfarad_ovadia', title: 'הרב עובדיה יוסף' },
    { id: 'sfarad_mordechai_eliyahu', title: 'הרב מרדכי אליהו' } ];
  private alive = true;
  private readonly key = `mikveh-admin-draft.v1.${this.auth.email()}`;
  get topic() { return this.bundle!.topics[this.topicIndex]; }
  get shared() { return ['odot', 'sipurim'].includes(this.topic.id); }
  get blocks() { return this.topic.content[this.shared ? 'chabad' : this.approach]; }
  constructor() { void this.load(); }
  ngOnDestroy() {
    this.alive = false;
    Object.values(this.previews).forEach(url => URL.revokeObjectURL(url));
  }
  @HostListener('window:beforeunload', ['$event']) beforeUnload(event: BeforeUnloadEvent) {
    if (this.dirty && !this.saved) event.preventDefault();
  }
  change() {
    if (this.shared) for (const approach of this.approaches)
      if (approach.id !== 'chabad') this.topic.content[approach.id] = structuredClone(this.blocks);
    this.dirty = true; this.message.set(''); this.remember();
  }
  private remember() {
    try {
      localStorage.setItem(this.key, JSON.stringify({ base: this.base, bundle: this.bundle }));
      this.saved = true;
    } catch { this.saved = false; }
  }
  async load() {
    this.busy.set(true); this.error.set(''); this.conflict.set(false);
    try {
      const current = await this.service.load();
      if (!this.alive) return;
      this.base = current.release.sha256; this.bundle = current.bundle;
      this.bundle.ads ??= []; this.dirty = false; this.saved = false;
      try {
        const previous = JSON.parse(localStorage.getItem(this.key) ?? 'null');
        if (previous && isContentBundle(previous.bundle) && typeof previous.base === 'string') {
          this.bundle = previous.bundle; this.bundle!.ads ??= [];
          this.dirty = true; this.saved = true;
          if (previous.base !== this.base) {
            this.base = previous.base; this.conflict.set(true);
            this.error.set('התוכן באפליקציה עודכן מאז העריכה שלך. העריכה שלך נשארה כאן, אך אי אפשר לשמור אותה על גבי העדכון החדש.');
          }
        }
      } catch { /* A missing or corrupt temporary save does not block editing. */ }
      await this.loadPreviews();
    } catch { this.error.set('לא ניתן לטעון את התוכן. בדקו את החיבור ונסו שוב.'); }
    finally { this.busy.set(false); }
  }
  add(type: 'text' | 'bold' | 'headline') { this.blocks.push({ type, data: '' }); this.change(); }
  move(items: unknown[], index: number, step: number) {
    const target = index + step;
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]]; this.change();
  }
  remove(items: unknown[], index: number) { items.splice(index, 1); this.change(); }
  async upload(event: Event, ad: boolean) {
    const input = event.target as HTMLInputElement; const file = input.files?.[0]; if (!file) return;
    if (mediaPaths(this.bundle!).length >= 12 || (ad && this.bundle!.ads!.length >= 10)) {
      this.error.set('אפשר להוסיף עד 12 תמונות שונות בסך הכול, ועד 10 פרסומות. הסירו תמונה קיימת כדי להוסיף חדשה.');
      input.value = ''; return;
    }
    const blocks = ad ? undefined : this.blocks;
    this.busy.set(true); this.error.set('');
    try {
      const image = await this.service.image(file);
      if (!this.alive) { URL.revokeObjectURL(image.preview); return; }
      if (this.previews[image.path]) URL.revokeObjectURL(this.previews[image.path]);
      this.previews[image.path] = image.preview;
      if (ad) this.bundle!.ads!.push({ id: crypto.randomUUID(), image: image.path, enabled: true });
      else blocks!.push({ type: 'img', data: image.path });
      this.change();
    } catch { this.error.set('העלאת התמונה נכשלה. השתמשו ב־JPG, PNG או WebP עד 10MB; בדקו גם חיבור והרשאות.'); }
    finally { input.value = ''; this.busy.set(false); }
  }
  image(path: string): string { return isMediaPath(path) ? this.previews[path] ?? '' : path; }
  private async loadPreviews() {
    for (const path of mediaPaths(this.bundle!)) if (!this.previews[path]) {
      const url = await this.service.preview(path);
      if (!this.alive) { URL.revokeObjectURL(url); return; }
      this.previews[path] = url;
    }
  }
  async publish() {
    if (this.busy() || !this.dirty || this.conflict()) return;
    this.busy.set(true); this.error.set('');
    try {
      const release = await this.service.publish(this.base, this.bundle!);
      this.base = release.sha256; this.dirty = false; this.saved = false;
      try { localStorage.removeItem(this.key); } catch { /* Server publication succeeded. */ }
      this.message.set('השינויים נשמרו. הם יופיעו באפליקציה בעדכון האוטומטי הבא.');
    } catch (error) {
      this.conflict.set(error instanceof Error && error.message === 'conflict');
      this.error.set(this.conflict()
        ? 'התוכן באפליקציה עודכן מאז שהתחלת לערוך. העריכה שלך נשארה כאן. העתיקו שינויים שתרצו לשמור לפני טעינת התוכן העדכני.'
        : 'השמירה לא הצליחה. השינויים נשארו כאן; בדקו את החיבור ונסו שוב.');
    } finally { this.busy.set(false); }
  }
  async reload() {
    if (this.dirty && !confirm('לטעון את התוכן העדכני? השינויים שעדיין לא נשמרו לאפליקציה יימחקו מהמסך הזה.')) return;
    try { localStorage.removeItem(this.key); } catch { this.error.set('לא ניתן לטעון מחדש כרגע.'); return; }
    await this.load();
  }
}
