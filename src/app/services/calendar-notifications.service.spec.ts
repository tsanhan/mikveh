import { TestBed } from '@angular/core/testing';
import { NgZone } from '@angular/core';
import { ActionPerformed, LocalNotificationsPlugin, LocalNotificationSchema } from '@capacitor/local-notifications';
import { Storage } from '@ionic/storage-angular';
import { BehaviorSubject } from 'rxjs';
import { HDate } from '@hebcal/core';
import { DayType, InputEventOna, InputEventType, OutputEvent } from '../interfaces/cal';
import { HDateToNgbDateStruct, hDateToHebrewDateKey } from '../utils/date.util';
import { DEFAULT_REMINDER_PREFERENCES, REMINDER_CATEGORIES, REMINDER_OWNER } from '../utils/calendar-reminders';
import { CacheService } from './cache.service';
import { CalService } from './cal.service';
import { CalendarNavigationService } from './calendar-navigation.service';
import {
  CalendarNotificationsService, LOCAL_NOTIFICATIONS, NOTIFICATION_APP, NOTIFICATION_PLATFORM,
} from './calendar-notifications.service';

describe('CalendarNotificationsService', () => {
  let api: jasmine.SpyObj<LocalNotificationsPlugin>;
  let storage: jasmine.SpyObj<Storage>;
  let events: BehaviorSubject<OutputEvent[]>;
  let pending: LocalNotificationSchema[];
  let onResume: (state: { isActive: boolean }) => void;
  let ready: Promise<void>;
  let onAction: (action: ActionPerformed) => void;

  const hdate = new HDate(new Date(2099, 1, 10, 12));
  const hefsek: OutputEvent = {
    id: 'hefsek', simpleDate: hdate.greg(), date: HDateToNgbDateStruct(hdate),
    outputEventType: DayType.CAN_START_CHECK_HEFSEK,
    segments: [{ hebrewDate: hDateToHebrewDateKey(hdate), onah: InputEventOna.DAY }],
    CachedInputEventRef: {
      id: 'source', simpleDate: hdate.greg(), date: HDateToNgbDateStruct(hdate),
      hebrewDate: hDateToHebrewDateKey(hdate), type: InputEventType.VESET, ona: InputEventOna.DAY,
    }, details: [],
  };

  beforeEach(() => {
    ready = Promise.resolve();
    pending = [];
    events = new BehaviorSubject([hefsek]);
    api = jasmine.createSpyObj<LocalNotificationsPlugin>('notifications', [
      'schedule', 'getPending', 'cancel', 'checkPermissions', 'requestPermissions',
      'checkExactNotificationSetting', 'changeExactNotificationSetting', 'createChannel', 'addListener',
    ]);
    api.getPending.and.callFake(async () => ({ notifications: pending }));
    api.schedule.and.callFake(async ({ notifications }) => {
      pending = [...pending.filter(n => !notifications.some(next => next.id === n.id)), ...notifications];
      return { notifications: notifications.map(n => ({ id: n.id })) };
    });
    api.cancel.and.callFake(async ({ notifications }) => {
      pending = pending.filter(n => !notifications.some(c => c.id === n.id));
    });
    api.checkPermissions.and.resolveTo({ display: 'granted' });
    api.requestPermissions.and.resolveTo({ display: 'granted' });
    api.checkExactNotificationSetting.and.resolveTo({ exact_alarm: 'granted' });
    api.changeExactNotificationSetting.and.resolveTo({ exact_alarm: 'granted' });
    api.createChannel.and.resolveTo();
    api.addListener.and.callFake((eventName, listener) => {
      if (eventName === 'localNotificationActionPerformed') onAction = listener as (action: ActionPerformed) => void;
      return Promise.resolve({ remove: async () => {} });
    });
    storage = jasmine.createSpyObj<Storage>('storage', ['get', 'set']);
    storage.get.and.resolveTo(false);
    storage.set.and.resolveTo();
  });

  function create(platform = 'ios'): CalendarNotificationsService {
    TestBed.configureTestingModule({ providers: [
      CalendarNotificationsService,
      { provide: LOCAL_NOTIFICATIONS, useValue: api },
      { provide: NOTIFICATION_PLATFORM, useValue: platform },
      { provide: NOTIFICATION_APP, useValue: {
        addListener: async (_: string, callback: typeof onResume) => {
          onResume = callback;
          return { remove: async () => {} };
        },
      } },
      { provide: CacheService, useValue: { ready } },
      { provide: CalService, useValue: { calendarEvents$: events } },
      { provide: Storage, useValue: storage },
    ] });
    return TestBed.inject(CalendarNotificationsService);
  }

  it('starts disabled and asks no permissions until explicitly enabled', async () => {
    const service = create();
    await service.initialize();
    expect(service.enabled()).toBeFalse();
    expect(api.requestPermissions).not.toHaveBeenCalled();
    expect(api.schedule).not.toHaveBeenCalled();
    await service.setEnabled(true);
    expect(service.enabled()).toBeTrue();
    expect(storage.set).toHaveBeenCalledWith('calendarNotificationsEnabled', true);
    expect(pending.length).toBe(1);
    expect(api.createChannel).not.toHaveBeenCalled();
  });

  it('restores the saved preference without prompting and initializes only once', async () => {
    storage.get.and.resolveTo(true);
    const service = create();
    await Promise.all([service.initialize(), service.initialize()]);
    expect(service.enabled()).toBeTrue();
    expect(api.schedule).toHaveBeenCalledTimes(1);
    expect(api.requestPermissions).not.toHaveBeenCalled();
  });

  it('keeps every category selected on first opt-in and on upgrade without saved categories', async () => {
    const service = create();
    await service.setEnabled(true);
    expect(service.preferences()).toEqual(DEFAULT_REMINDER_PREFERENCES);
    expect(pending.length).toBe(1);
  });

  it('reschedules pending reminders immediately when a category is disabled and restores it independently', async () => {
    const service = create();
    await service.setEnabled(true);
    await service.setCategoryEnabled('hefsek', false);
    expect(service.enabled()).toBeTrue();
    expect(pending).toEqual([]);
    expect(storage.set).toHaveBeenCalledWith('calendarNotificationPreferences', jasmine.objectContaining({ hefsek: false }));
    await service.setCategoryEnabled('hefsek', true);
    expect(pending.length).toBe(1);
    expect(api.requestPermissions).toHaveBeenCalledTimes(1);
  });

  for (const category of REMINDER_CATEGORIES) {
    it(`schedules only ${category.key} through the native API when it is the only selected category`, async () => {
      const next = hdate.add(1, 'd');
      const previous = hdate.subtract(1, 'd');
      events.next([
        hefsek,
        { ...hefsek, id: 'clean', outputEventType: DayType.SEVEN_CLEAN,
          CachedInputEventRef: { ...hefsek.CachedInputEventRef, type: InputEventType.HEFSEK_TAHARA,
            hebrewDate: hDateToHebrewDateKey(previous) } },
        { ...hefsek, id: 'mikveh', outputEventType: DayType.MIKVEH_DAY,
          segments: [{ hebrewDate: hDateToHebrewDateKey(next), onah: InputEventOna.NIGHT }] },
        { ...hefsek, id: 'concern', outputEventType: DayType.VESET_HACHODESH_NIGHT,
          segments: [{ hebrewDate: hDateToHebrewDateKey(next), onah: InputEventOna.NIGHT }] },
      ]);
      const service = create('android');
      await service.setEnabled(true);
      expect(pending.length).toBe(1);
      expect(pending[0].body!.split('\n').length).toBe(4);
      for (const { key } of REMINDER_CATEGORIES) {
        if (key !== category.key) await service.setCategoryEnabled(key, false);
      }
      const messages = { hefsek: 'הפסק טהרה', sevenClean: 'ב־7 נקיים', mikveh: 'ליל מקווה', concerns: 'עונת חשש' };
      expect(service.enabled()).toBeTrue();
      expect(pending.length).toBe(1);
      expect(pending[0].body!.split('\n').length).toBe(1);
      expect(pending[0].body).toContain(messages[category.key]);
      expect(api.cancel).toHaveBeenCalled();
      await service.setCategoryEnabled(category.key, false);
      expect(pending).toEqual([]);
      expect(service.enabled()).toBeFalse();
    });
  }

  it('turns the master off after the last category is disabled and resets all on the next opt-in', async () => {
    const service = create();
    await service.setEnabled(true);
    for (const { key } of REMINDER_CATEGORIES) await service.setCategoryEnabled(key, false);
    expect(service.enabled()).toBeFalse();
    expect(pending).toEqual([]);
    expect(storage.set).toHaveBeenCalledWith('calendarNotificationsEnabled', false);
    await service.setEnabled(true);
    expect(service.enabled()).toBeTrue();
    expect(service.preferences()).toEqual(DEFAULT_REMINDER_PREFERENCES);
    expect(pending.length).toBe(1);
  });

  it('preserves a partial selection when the master is switched off and on', async () => {
    const service = create();
    await service.setEnabled(true);
    await service.setCategoryEnabled('hefsek', false);
    await service.setEnabled(false);
    await service.setEnabled(true);
    expect(service.preferences()).toEqual({ ...DEFAULT_REMINDER_PREFERENCES, hefsek: false });
    expect(pending).toEqual([]);
  });

  it('allows choosing categories with the master off without asking permission or enabling delivery', async () => {
    const service = create();
    await service.setCategoryEnabled('hefsek', false);
    expect(service.enabled()).toBeFalse();
    expect(service.preferences().hefsek).toBeFalse();
    expect(api.requestPermissions).not.toHaveBeenCalled();
    expect(api.schedule).not.toHaveBeenCalled();
  });

  it('restores the individual selections after an app restart', async () => {
    const saved = new Map<string, unknown>();
    storage.get.and.callFake(async key => saved.get(key));
    storage.set.and.callFake(async (key, value) => { saved.set(key, value); });
    const service = create();
    await service.setEnabled(true);
    await service.setCategoryEnabled('hefsek', false);
    TestBed.resetTestingModule();
    const restored = create();
    await restored.initialize();
    expect(restored.enabled()).toBeTrue();
    expect(restored.preferences().hefsek).toBeFalse();
    expect(pending).toEqual([]);
  });

  it('repairs an enabled master with no selected categories on startup', async () => {
    storage.get.and.callFake(async key => key === 'calendarNotificationsEnabled'
      ? true : { hefsek: false, sevenClean: false, mikveh: false, concerns: false });
    const service = create();
    await service.initialize();
    expect(service.enabled()).toBeFalse();
    expect(api.schedule).not.toHaveBeenCalled();
    expect(storage.set).toHaveBeenCalledWith('calendarNotificationsEnabled', false);
  });

  it('does not touch pending notifications until saved calendar data is ready', async () => {
    let resolve!: () => void;
    ready = new Promise<void>(r => resolve = r);
    const service = create();
    const initializing = service.initialize();
    await Promise.resolve();
    expect(api.getPending).not.toHaveBeenCalled();
    resolve();
    await initializing;
    expect(api.getPending).toHaveBeenCalled();
  });

  it('keeps the toggle off after denied permission and cancels old reminders', async () => {
    const service = create();
    await service.initialize();
    pending = [{ id: 123, title: 'old', body: 'old', extra: { owner: REMINDER_OWNER } }];
    api.requestPermissions.and.resolveTo({ display: 'denied' });
    await service.setEnabled(true);
    expect(service.enabled()).toBeFalse();
    expect(service.error()).toContain('לאפשר התראות');
    expect(pending).toEqual([]);
    expect(api.schedule).not.toHaveBeenCalled();
  });

  it('disabling cancels only calendar reminders and persists the choice', async () => {
    const service = create();
    await service.setEnabled(true);
    pending.push({ id: 321, title: 'unrelated', body: 'unrelated' });
    await service.setEnabled(false);
    expect(pending.map(n => n.id)).toEqual([321]);
    expect(service.enabled()).toBeFalse();
    expect(storage.set).toHaveBeenCalledWith('calendarNotificationsEnabled', false);
  });

  it('cancels invalidated events and reschedules changed calendar data', async () => {
    const service = create();
    await service.setEnabled(true);
    events.next([]);
    await service.refresh();
    expect(pending).toEqual([]);
    events.next([hefsek]);
    await service.refresh();
    expect(pending.length).toBe(1);
  });

  it('automatically refreshes on calendar emissions and app resume', async () => {
    const service = create();
    await service.setEnabled(true);
    events.next([]);
    await new Promise(r => setTimeout(r, 150));
    expect(pending).toEqual([]);
    events.next([hefsek]);
    onResume({ isActive: true });
    await service.refresh();
    expect(pending.length).toBe(1);
  });

  it('cancels scheduled reminders if system permissions have been revoked on resume', async () => {
    const service = create();
    await service.setEnabled(true);
    api.checkPermissions.and.resolveTo({ display: 'denied' });
    await service.refresh();
    expect(pending).toEqual([]);
    expect(service.error()).toContain('חסומות');
    expect(api.requestPermissions).toHaveBeenCalledTimes(1);
  });

  it('recovers from a native scheduling failure on a later refresh', async () => {
    const service = create();
    api.schedule.and.rejectWith(new Error('native failure'));
    await service.setEnabled(true);
    expect(service.error()).toContain('לא ניתן לעדכן');
    expect(service.busy()).toBeFalse();
    api.schedule.and.resolveTo({ notifications: [] });
    await service.refresh();
    expect(service.error()).toBe('');
  });

  it('keeps reminders cancelled when disabling while an older native schedule is in flight', async () => {
    const service = create();
    await service.initialize();
    let release!: () => void;
    let started!: () => void;
    const scheduled = new Promise<void>(resolve => started = resolve);
    api.schedule.and.callFake(async ({ notifications }) => {
      started();
      await new Promise<void>(resolve => release = resolve);
      pending = [...notifications];
      return { notifications: notifications.map(n => ({ id: n.id })) };
    });
    const enabling = service.setEnabled(true);
    await scheduled;
    const disabling = service.setEnabled(false);
    release();
    await Promise.all([enabling, disabling]);
    expect(service.enabled()).toBeFalse();
    expect(pending).toEqual([]);
  });

  it('checks Android exact-alarm settings and creates its channel', async () => {
    const service = create('android');
    api.checkExactNotificationSetting.and.returnValues(
      Promise.resolve({ exact_alarm: 'denied' }), Promise.resolve({ exact_alarm: 'granted' }),
    );
    await service.setEnabled(true);
    expect(api.changeExactNotificationSetting).toHaveBeenCalled();
    expect(api.createChannel).toHaveBeenCalled();
    expect(pending.length).toBe(1);
  });

  it('explains missing exact-alarm access instead of silently using an inexact time', async () => {
    const service = create('android');
    api.checkExactNotificationSetting.and.resolveTo({ exact_alarm: 'denied' });
    await service.setEnabled(true);
    expect(api.schedule).not.toHaveBeenCalled();
    expect(service.error()).toContain('בשעה מדויקת');
  });

  it('never calls native APIs in the website', async () => {
    const service = create('web');
    await service.initialize();
    await service.setEnabled(true);
    await service.refresh();
    expect(service.supported).toBeFalse();
    expect(api.getPending).not.toHaveBeenCalled();
    expect(api.requestPermissions).not.toHaveBeenCalled();
    expect(storage.get).not.toHaveBeenCalled();
  });

  it('replaces legacy pending previews with real calendar reminders on upgrade', async () => {
    storage.get.and.resolveTo(true);
    pending = [{ id: -1000000000, title: 'old preview', body: 'old preview',
      extra: { owner: REMINDER_OWNER, test: true } }];
    const service = create('android');
    await service.initialize();
    expect(pending.length).toBe(1);
    expect(pending[0].id).not.toBe(-1000000000);
    expect(pending[0].extra.test).not.toBeTrue();
  });

  it('handles notification clicks before storage is ready and queues the canonical target', async () => {
    let finishLoading!: () => void;
    ready = new Promise<void>(resolve => finishLoading = resolve);
    const service = create();
    const starting = service.initialize();
    const navigation = TestBed.inject(CalendarNavigationService);
    const open = spyOn(navigation, 'open').and.callThrough();
    const target = { hebrewDate: hDateToHebrewDateKey(hdate), onah: InputEventOna.NIGHT };
    onAction({ actionId: 'tap', notification: {
      id: 123, title: 'reminder', body: 'reminder', extra: { owner: REMINDER_OWNER, target },
    } });
    expect(open).toHaveBeenCalledWith(target);
    expect(api.getPending).not.toHaveBeenCalled();
    finishLoading();
    await starting;
  });

  it('does not navigate on clicks of unrelated or malformed notifications', async () => {
    const service = create();
    await service.initialize();
    const open = spyOn(TestBed.inject(CalendarNavigationService), 'open');
    for (const extra of [{}, { owner: REMINDER_OWNER, target: { hebrewDate: null } },
      { owner: REMINDER_OWNER, test: true, target: { hebrewDate: hDateToHebrewDateKey(hdate), onah: InputEventOna.DAY } }]) {
      onAction({ actionId: 'tap', notification: { id: 123, title: 'other', body: 'other', extra } });
    }
    expect(open).not.toHaveBeenCalled();
  });

  it('reenters Angular for a native notification tap', async () => {
    await create('android').initialize();
    const target = { hebrewDate: { year: 5787, month: 9, day: 10 }, onah: InputEventOna.DAY };
    let inAngular = false;
    spyOn(TestBed.inject(CalendarNavigationService), 'open').and.callFake(() => {
      inAngular = NgZone.isInAngularZone();
    });
    TestBed.inject(NgZone).runOutsideAngular(() => onAction({ actionId: 'tap', notification: {
      id: 123, title: 'reminder', body: 'reminder', extra: { owner: REMINDER_OWNER, target },
    } }));
    expect(inAngular).toBeTrue();
  });
});
