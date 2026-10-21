import { DestroyRef, inject, Injectable, InjectionToken, NgZone, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { App, AppPlugin } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications, LocalNotificationsPlugin } from '@capacitor/local-notifications';
import { Storage } from '@ionic/storage-angular';
import { debounceTime } from 'rxjs';
import { OutputEvent } from '../interfaces/cal';
import {
  calendarReminders, CalendarReminderCategory, DEFAULT_REMINDER_PREFERENCES,
  normalizeReminderPreferences, notificationCalendarTarget, REMINDER_CATEGORIES,
  REMINDER_CHANNEL, REMINDER_OWNER,
} from '../utils/calendar-reminders';
import { CacheService } from './cache.service';
import { CalService } from './cal.service';
import { CalendarNavigationService } from './calendar-navigation.service';

export const LOCAL_NOTIFICATIONS = new InjectionToken<LocalNotificationsPlugin>('LocalNotifications', {
  providedIn: 'root', factory: () => LocalNotifications,
});
export const NOTIFICATION_PLATFORM = new InjectionToken<string>('NotificationPlatform', {
  providedIn: 'root', factory: () => Capacitor.getPlatform(),
});
export const NOTIFICATION_APP = new InjectionToken<AppPlugin>('NotificationApp', {
  providedIn: 'root', factory: () => App,
});
const ENABLED_KEY = 'calendarNotificationsEnabled';
const PREFERENCES_KEY = 'calendarNotificationPreferences';

@Injectable({ providedIn: 'root' })
export class CalendarNotificationsService {
  private readonly api = inject(LOCAL_NOTIFICATIONS);
  private readonly platform = inject(NOTIFICATION_PLATFORM);
  private readonly app = inject(NOTIFICATION_APP);
  private readonly cache = inject(CacheService);
  private readonly cal = inject(CalService);
  private readonly storage = inject(Storage);
  private readonly destroyRef = inject(DestroyRef);
  private readonly navigation = inject(CalendarNavigationService);
  private readonly zone = inject(NgZone);
  readonly supported = this.platform === 'android' || this.platform === 'ios';
  readonly categories = REMINDER_CATEGORIES;
  readonly preferences = signal({ ...DEFAULT_REMINDER_PREFERENCES });
  readonly enabled = signal(false);
  readonly busy = signal(true);
  readonly error = signal('');
  private events: OutputEvent[] = [];
  private initialization?: Promise<void>;
  private work: Promise<void> = Promise.resolve();
  private pendingChanges = 0;

  initialize(): Promise<void> {
    return this.initialization ??= this.start().catch(() => {
      this.error.set('לא ניתן לטעון את התזכורות. יש לפתוח את האפליקציה מחדש.');
    }).finally(() => this.busy.set(false));
  }

  private async start(): Promise<void> {
    if (!this.supported) return;
    // Register before loading storage: Capacitor retains cold-start taps until
    // this listener attaches. The navigation service buffers them for the UI.
    const actionListener = await this.api.addListener('localNotificationActionPerformed', action => {
      const target = notificationCalendarTarget(action.notification?.extra);
      // Native listeners run outside Angular, including retained cold-start taps.
      if (target) this.zone.run(() => this.navigation.open(target));
    });
    this.destroyRef.onDestroy(() => void actionListener.remove());
    // Do not cancel native reminders while the saved calendar is still loading.
    await this.cache.ready;
    this.preferences.set(normalizeReminderPreferences(await this.storage.get(PREFERENCES_KEY)));
    const savedEnabled = await this.storage.get(ENABLED_KEY) === true;
    const anySelected = Object.values(this.preferences()).some(Boolean);
    this.enabled.set(savedEnabled && anySelected);
    if (savedEnabled && !anySelected) await this.storage.set(ENABLED_KEY, false);
    this.cal.calendarEvents$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(events => {
      this.events = events;
    });
    await this.enqueue(() => this.synchronize());
    this.cal.calendarEvents$.pipe(
      debounceTime(100), takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => void this.refresh());
    const stateListener = await this.app.addListener('appStateChange', state => {
      if (state.isActive) void this.refresh();
    });
    const receivedListener = await this.api.addListener('localNotificationReceived', () => void this.refresh());
    this.destroyRef.onDestroy(() => {
      void stateListener.remove();
      void receivedListener.remove();
    });
  }

  async setEnabled(enabled: boolean): Promise<void> {
    await this.initialize();
    if (!this.supported) return;
    await this.changeSettings(async () => {
      this.error.set('');
      if (enabled) {
        const permission = await this.api.requestPermissions();
        if (permission.display !== 'granted') {
          await this.storage.set(ENABLED_KEY, false);
          this.enabled.set(false);
          await this.cancelPending();
          this.error.set('יש לאפשר התראות בהגדרות המכשיר ואז להפעיל את התזכורות.');
          return;
        }
      }
      if (enabled && !Object.values(this.preferences()).some(Boolean)) {
        // Turning the master back on after disabling every category starts
        // with all categories, just like the first opt-in.
        const preferences = { ...DEFAULT_REMINDER_PREFERENCES };
        await this.storage.set(PREFERENCES_KEY, preferences);
        this.preferences.set(preferences);
      }
      await this.storage.set(ENABLED_KEY, enabled);
      this.enabled.set(enabled);
      if (enabled && this.platform === 'android') {
        const setting = await this.api.checkExactNotificationSetting();
        if (setting.exact_alarm !== 'granted') await this.api.changeExactNotificationSetting();
      }
      await this.synchronize();
    });
  }

  async setCategoryEnabled(category: CalendarReminderCategory, enabled: boolean): Promise<void> {
    await this.initialize();
    if (!this.supported) return;
    await this.changeSettings(async () => {
      const preferences = { ...this.preferences(), [category]: enabled };
      const anySelected = Object.values(preferences).some(Boolean);
      await this.storage.set(PREFERENCES_KEY, preferences);
      if (!anySelected) await this.storage.set(ENABLED_KEY, false);
      this.preferences.set(preferences);
      if (!anySelected) this.enabled.set(false);
      await this.synchronize();
    });
  }

  async refresh(): Promise<void> {
    if (this.supported) await this.enqueue(() => this.synchronize());
  }

  private async changeSettings(action: () => Promise<void>): Promise<void> {
    this.pendingChanges++;
    this.busy.set(true);
    try {
      await this.enqueue(action);
    } finally {
      this.pendingChanges--;
      this.busy.set(this.pendingChanges > 0);
    }
  }

  private enqueue(action: () => Promise<void>): Promise<void> {
    // Serialize native mutations: an older schedule must never restore reminders
    // after the user has disabled them or changed the calendar.
    this.work = this.work.then(action).catch(() => {
      this.error.set('לא ניתן לעדכן את התזכורות. יש לנסות שוב או לבדוק את הרשאות המכשיר.');
    });
    return this.work;
  }

  private async cancelPending(): Promise<void> {
    const pending = await this.api.getPending();
    const notifications = pending.notifications
      .filter(n => n.extra?.owner === REMINDER_OWNER)
      .map(n => ({ id: n.id }));
    if (notifications.length) await this.api.cancel({ notifications });
  }

  private async synchronize(): Promise<void> {
    this.error.set('');
    await this.cancelPending();
    if (!this.enabled()) return;
    const permission = await this.api.checkPermissions();
    if (permission.display !== 'granted') {
      this.error.set('התזכורות חסומות. יש לאפשר התראות בהגדרות המכשיר.');
      return;
    }
    if (this.platform === 'android') {
      const setting = await this.api.checkExactNotificationSetting();
      if (setting.exact_alarm !== 'granted') {
        this.error.set('יש לאפשר תזכורות בשעה מדויקת בהגדרות המכשיר ולהפעיל את המתג מחדש.');
        return;
      }
      await this.api.createChannel({
        id: REMINDER_CHANNEL, name: 'תזכורות מהיומן', importance: 4, visibility: 0,
      });
    }
    const notifications = calendarReminders(this.events, new Date(), this.preferences());
    if (notifications.length) await this.api.schedule({ notifications });
  }
}
