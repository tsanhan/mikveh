import { LocalNotificationSchema } from '@capacitor/local-notifications';
import { DayType, InputEventOna, OnahRef, OutputEvent } from '../interfaces/cal';
import { hebrewDateKeyToHDate } from './date.util';

export const REMINDER_HOUR = 9;
export const REMINDER_OWNER = 'mikveh-calendar';
export const REMINDER_CHANNEL = 'calendar-reminders';
// iOS has a finite pending queue. Keep the nearest 60 daily reminders and
// replenish on launch/resume and whenever the calendar changes.
export const MAX_PENDING_REMINDERS = 60;

export interface CalendarReminderPreferences {
  hefsek: boolean;
  sevenClean: boolean;
  mikveh: boolean;
  concerns: boolean;
}

export type CalendarReminderCategory = keyof CalendarReminderPreferences;

export const DEFAULT_REMINDER_PREFERENCES: Readonly<CalendarReminderPreferences> = {
  hefsek: true, sevenClean: true, mikveh: true, concerns: true,
};

export const REMINDER_CATEGORIES: ReadonlyArray<{ key: CalendarReminderCategory; label: string }> = [
  { key: 'hefsek', label: 'הפסק טהרה' },
  { key: 'sevenClean', label: 'בדיקות 7 נקיים' },
  { key: 'mikveh', label: 'טבילה' },
  { key: 'concerns', label: 'עונות חשש' },
];

/** Missing preferences keep existing users' notification categories enabled. */
export function normalizeReminderPreferences(value: unknown): CalendarReminderPreferences {
  const result = { ...DEFAULT_REMINDER_PREFERENCES };
  if (value && typeof value === 'object') {
    const stored = value as Record<string, unknown>;
    for (const category of Object.keys(result) as CalendarReminderCategory[]) {
      if (typeof stored[category] === 'boolean') result[category] = stored[category];
    }
  }
  return result;
}

/** One notification per civil day, containing every action for that day. */
export function calendarReminders(
  events: OutputEvent[], now = new Date(),
  preferences: Readonly<CalendarReminderPreferences> = DEFAULT_REMINDER_PREFERENCES,
): LocalNotificationSchema[] {
  const days = new Map<number, { at: Date; messages: Set<string>; target: OnahRef }>();
  for (const event of events) {
    const segment = event.segments[0];
    if (!segment) continue;
    const hdate = hebrewDateKeyToHDate(segment.hebrewDate);
    let message: string;
    let night = false;
    switch (event.outputEventType) {
      case DayType.CAN_START_CHECK_HEFSEK:
        if (!preferences.hefsek) continue;
        message = event.details[0] || 'היום אפשר לבצע הפסק טהרה לפני השקיעה';
        break;
      case DayType.SEVEN_CLEAN: {
        if (!preferences.sevenClean) continue;
        const day = hdate.abs() - hebrewDateKeyToHDate(event.CachedInputEventRef.hebrewDate).abs();
        if (day < 1 || day > 7) continue;
        message = `היום יום ${day} ב־7 נקיים ונדרשת בדיקה`;
        break;
      }
      case DayType.MIKVEH_DAY:
        if (!preferences.mikveh) continue;
        night = true;
        message = 'הערב ליל מקווה';
        break;
      case DayType.ONA_BEINONIT:
      case DayType.VESET_HACHODESH_DAY:
      case DayType.VESET_HACHODESH_NIGHT:
      case DayType.HAFLAGA_DAY:
      case DayType.HAFLAGA_NIGHT:
      case DayType.VESET_KAVUA: {
        if (!preferences.concerns) continue;
        const label = event.outputEventType === DayType.ONA_BEINONIT ? 'עונה בינונית'
          : event.outputEventType === DayType.VESET_KAVUA ? 'וסת קבוע'
          : [DayType.HAFLAGA_DAY, DayType.HAFLAGA_NIGHT].includes(event.outputEventType) ? 'הפלגה'
          : 'וסת החודש';
        const fullDay = event.segments.some(s => s.onah === InputEventOna.DAY) &&
          event.segments.some(s => s.onah === InputEventOna.NIGHT);
        night = fullDay || segment.onah === InputEventOna.NIGHT;
        message = fullDay ? `מהערב עונת חשש — ${label} (לילה ויום)`
          : `${night ? 'הערב' : 'היום'} עונת חשש — ${label} (${night ? 'לילה' : 'יום'})`;
        const guidance = event.details.slice(1).join(' ');
        if (guidance) message += `: ${guidance}`;
        break;
      }
      default:
        continue;
    }
    // A Hebrew night's civil evening is the previous Gregorian date.
    // Use calendar arithmetic (not milliseconds) across daylight-saving changes.
    const at = hdate.greg();
    if (night) at.setDate(at.getDate() - 1);
    at.setHours(REMINDER_HOUR, 0, 0, 0);
    if (at.getTime() <= now.getTime()) continue;
    const id = at.getFullYear() * 10000 + (at.getMonth() + 1) * 100 + at.getDate();
    const entry = days.get(id) ?? {
      at, messages: new Set<string>(),
      // A combined notification opens the first action in its displayed body.
      target: { hebrewDate: { ...segment.hebrewDate }, onah: night ? InputEventOna.NIGHT : InputEventOna.DAY },
    };
    entry.messages.add(message);
    days.set(id, entry);
  }
  return [...days.entries()]
    .sort((a, b) => a[1].at.getTime() - b[1].at.getTime())
    .slice(0, MAX_PENDING_REMINDERS)
    .map(([id, { at, messages, target }]) => ({
      id,
      title: 'תזכורת מהיומן',
      body: [...messages].join('\n'),
      schedule: { at, allowWhileIdle: true },
      channelId: REMINDER_CHANNEL,
      largeIcon: 'ic_mikveh',
      extra: { owner: REMINDER_OWNER, target },
    }));
}

/** Native notification payloads are persisted JSON; validate before navigation. */
export function notificationCalendarTarget(extra: unknown): OnahRef | null {
  if (!extra || typeof extra !== 'object') return null;
  const payload = extra as Record<string, unknown>;
  if (payload['owner'] !== REMINDER_OWNER || payload['test'] === true) return null;
  const target = payload['target'] as Partial<OnahRef> | undefined;
  if (!target || (target.onah !== InputEventOna.DAY && target.onah !== InputEventOna.NIGHT)) return null;
  const date = target.hebrewDate;
  if (!date || !Number.isInteger(date.year) || date.year < 1 || date.year > 9999 ||
      !Number.isInteger(date.month) || date.month < 1 || date.month > 13 ||
      !Number.isInteger(date.day) || date.day < 1 || date.day > 30) return null;
  try {
    const hdate = hebrewDateKeyToHDate(date);
    if (hdate.getFullYear() !== date.year || hdate.getMonth() !== date.month || hdate.getDate() !== date.day) return null;
    return { hebrewDate: { ...date }, onah: target.onah };
  } catch {
    return null;
  }
}
