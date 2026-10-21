import { DestroyRef, inject, Injectable, InjectionToken, NgZone, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { App, AppPlugin } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications, LocalNotificationsPlugin } from '@capacitor/local-notifications';
import { Storage } from '@ionic/storage-angular';
import { debounceTime } from 'rxjs';
import { OutputEvent } from '../interfaces/cal';
import { calendarReminders, notificationCalendarTarget, REMINDER_CHANNEL, REMINDER_OWNER } from '../utils/calendar-reminders';
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
  readonly enabled = signal(false);
  readonly busy = signal(true);
  readonly error = signal('');
  private events: OutputEvent[] = [];
  private initialization?: Promise<void>;
  private work: Promise<void> = Promise.resolve();

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
    this.enabled.set(await this.storage.get(ENABLED_KEY) === true);
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
    this.busy.set(true);
    await this.enqueue(async () => {
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
      await this.storage.set(ENABLED_KEY, enabled);
      this.enabled.set(enabled);
      if (enabled && this.platform === 'android') {
        const setting = await this.api.checkExactNotificationSetting();
        if (setting.exact_alarm !== 'granted') await this.api.changeExactNotificationSetting();
      }
      await this.synchronize();
    });
    this.busy.set(false);
  }

  async refresh(): Promise<void> {
    if (this.supported) await this.enqueue(() => this.synchronize());
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
    const notifications = calendarReminders(this.events);
    if (notifications.length) await this.api.schedule({ notifications });
  }
}
