import { HDate } from '@hebcal/core';
import { DayType, InputEventOna, InputEventType, OutputEvent } from '../interfaces/cal';
import { HDateToNgbDateStruct, hDateToHebrewDateKey } from './date.util';
import {
  calendarReminders, DEFAULT_REMINDER_PREFERENCES, MAX_PENDING_REMINDERS,
  normalizeReminderPreferences, notificationCalendarTarget, REMINDER_OWNER,
} from './calendar-reminders';

function event(type: DayType, date: Date, night = false, cleanDay = 1): OutputEvent {
  const hdate = new HDate(date);
  const source = hdate.subtract(cleanDay, 'd');
  return {
    id: `${type}:${hdate.abs()}`, sourceEventId: 'source',
    simpleDate: date, date: HDateToNgbDateStruct(hdate), outputEventType: type,
    segments: [{ hebrewDate: hDateToHebrewDateKey(hdate), onah: night ? InputEventOna.NIGHT : InputEventOna.DAY }],
    CachedInputEventRef: {
      id: 'source', type: InputEventType.HEFSEK_TAHARA, ona: InputEventOna.DAY,
      simpleDate: source.greg(), hebrewDate: hDateToHebrewDateKey(source), date: HDateToNgbDateStruct(source),
    },
    details: [],
  };
}

describe('calendarReminders', () => {
  const date = new Date(2026, 9, 25, 12);
  const now = new Date(2026, 9, 1);

  it('defaults missing and invalid saved preferences to all categories, preserving explicit false values', () => {
    expect(normalizeReminderPreferences(null)).toEqual(DEFAULT_REMINDER_PREFERENCES);
    expect(normalizeReminderPreferences({ hefsek: false, sevenClean: 'false', mikveh: null, extra: false }))
      .toEqual({ hefsek: false, sevenClean: true, mikveh: true, concerns: true });
  });

  it('filters all 16 category combinations before combining same-day actions', () => {
    const events = [event(DayType.CAN_START_CHECK_HEFSEK, date), event(DayType.SEVEN_CLEAN, date),
      event(DayType.MIKVEH_DAY, new Date(2026, 9, 26, 12), true), event(DayType.HAFLAGA_DAY, date)];
    const categories = ['hefsek', 'sevenClean', 'mikveh', 'concerns'] as const;
    const messages = ['הפסק טהרה', 'ב־7 נקיים', 'ליל מקווה', 'עונת חשש'];
    for (let mask = 0; mask < 16; mask++) {
      const selected = categories.map((_, i) => Boolean(mask & (1 << i)));
      const preferences = { hefsek: selected[0], sevenClean: selected[1], mikveh: selected[2], concerns: selected[3] };
      const reminders = calendarReminders(events, now, preferences);
      expect(reminders.length).withContext(`selection ${mask}`).toBe(mask ? 1 : 0);
      if (!mask) continue;
      expect(reminders[0].body!.split('\n').length).toBe(selected.filter(Boolean).length);
      messages.forEach((message, i) => {
        expect(reminders[0].body!.includes(message)).withContext(`${mask}: ${categories[i]}`).toBe(selected[i]);
      });
      const target = notificationCalendarTarget(reminders[0].extra)!;
      expect(target.hebrewDate).toEqual(events[selected.indexOf(true)].segments[0].hebrewDate);
    }
  });

  it('excludes disabled actions from both a combined message and its navigation target', () => {
    const clean = event(DayType.SEVEN_CLEAN, date, false, 7);
    const mikveh = event(DayType.MIKVEH_DAY, new Date(2026, 9, 26, 12), true);
    const [nightReminder] = calendarReminders([clean, mikveh], now, { ...DEFAULT_REMINDER_PREFERENCES, sevenClean: false });
    expect(nightReminder.body).toBe('הערב ליל מקווה');
    expect(notificationCalendarTarget(nightReminder.extra)).toEqual({
      hebrewDate: mikveh.segments[0].hebrewDate, onah: InputEventOna.NIGHT,
    });
    const [dayReminder] = calendarReminders([clean, mikveh], now, { ...DEFAULT_REMINDER_PREFERENCES, mikveh: false });
    expect(dayReminder.body).toContain('היום יום 7');
    expect(notificationCalendarTarget(dayReminder.extra)).toEqual({
      hebrewDate: clean.segments[0].hebrewDate, onah: InputEventOna.DAY,
    });
  });

  it('includes Hefsek and each of the seven clean-day numbers at 09:00', () => {
    const events = [event(DayType.CAN_START_CHECK_HEFSEK, date)];
    for (let day = 1; day <= 7; day++) {
      events.push(event(DayType.SEVEN_CLEAN, new Date(2026, 9, 25 + day, 12), false, day));
    }
    const reminders = calendarReminders(events, now);
    expect(reminders.length).toBe(8);
    expect(reminders[0].body).toContain('הפסק טהרה');
    for (let day = 1; day <= 7; day++) {
      expect(reminders[day].body).toBe(`היום יום ${day} ב־7 נקיים ונדרשת בדיקה`);
    }
    expect(reminders.every(r => r.schedule!.at!.getHours() === 9 && r.schedule!.at!.getMinutes() === 0)).toBeTrue();
  });

  it('reminds about mikveh on the morning before the night that opens the Hebrew date', () => {
    const [reminder] = calendarReminders([event(DayType.MIKVEH_DAY, date, true)], now);
    expect(reminder.schedule!.at).toEqual(new Date(2026, 9, 24, 9));
    expect(reminder.body).toBe('הערב ליל מקווה');
    expect(notificationCalendarTarget(JSON.parse(JSON.stringify(reminder.extra)))).toEqual({
      hebrewDate: hDateToHebrewDateKey(new HDate(date)), onah: InputEventOna.NIGHT,
    });
  });

  for (const type of [DayType.VESET_HACHODESH_DAY, DayType.VESET_HACHODESH_NIGHT,
    DayType.ONA_BEINONIT, DayType.HAFLAGA_DAY, DayType.HAFLAGA_NIGHT, DayType.VESET_KAVUA]) {
    for (const night of [false, true]) {
      it(`maps ${type}, ${night ? 'night' : 'day'}, from its canonical onah`, () => {
        const [reminder] = calendarReminders([event(type, date, night)], now);
        expect(reminder.schedule!.at).toEqual(new Date(2026, 9, night ? 24 : 25, 9));
        expect(reminder.body).toContain(night ? 'הערב' : 'היום');
        expect(reminder.body).toContain('עונת חשש');
        expect(calendarReminders([event(type, date, night)], now,
          { ...DEFAULT_REMINDER_PREFERENCES, concerns: false })).toEqual([]);
      });
    }
  }

  it('sends a full-day concern once, before its opening evening, regardless of segment order', () => {
    const concern = event(DayType.ONA_BEINONIT, date, true);
    concern.segments.push({ ...concern.segments[0], onah: InputEventOna.DAY });
    const reminders = calendarReminders([concern, concern], now);
    expect(reminders.length).toBe(1);
    expect(reminders[0].body).toContain('לילה ויום');
    expect(reminders[0].schedule!.at).toEqual(new Date(2026, 9, 24, 9));
    concern.segments.reverse();
    expect(calendarReminders([concern], now)).toEqual(reminders);
  });

  it('includes the practical concern instruction from the calendar in the notification', () => {
    const concern = event(DayType.ONA_BEINONIT, date);
    concern.details = [
      'חשש עונה בינונית - יום',
      'יש לפרוש מתשמיש ולבדוק בסוף העונה; טוב לבדוק גם בתחילתה.',
    ];
    const [reminder] = calendarReminders([concern], now);
    expect(reminder.body).toContain('עונה בינונית');
    expect(reminder.body).toContain(concern.details[1]);
  });

  it('combines distinct same-day actions and removes duplicate calendar entries', () => {
    const hefsek = event(DayType.CAN_START_CHECK_HEFSEK, date);
    const concern = event(DayType.HAFLAGA_DAY, date);
    const reminders = calendarReminders([hefsek, hefsek, concern], now);
    expect(reminders.length).toBe(1);
    expect(reminders[0].body!.split('\n').length).toBe(2);
    expect(reminders[0].body).toContain('הפסק טהרה');
    expect(reminders[0].body).toContain('הפלגה');
    expect(notificationCalendarTarget(reminders[0].extra)).toEqual({
      hebrewDate: hefsek.segments[0].hebrewDate, onah: InputEventOna.DAY,
    });
  });

  it('rejects unknown owners, invalid calendar dates, invalid onot, and old payloads', () => {
    const valid = { owner: REMINDER_OWNER, target: {
      hebrewDate: hDateToHebrewDateKey(new HDate(date)), onah: InputEventOna.DAY,
    } };
    expect(notificationCalendarTarget(valid)).toEqual(valid.target);
    for (const extra of [null, {}, { owner: REMINDER_OWNER }, { ...valid, owner: 'other' },
      { ...valid, target: { ...valid.target, onah: 'other' } },
      ...[
        { year: 5787, month: 7, day: 0 }, { year: 5787, month: 7, day: 31 },
        { year: 5787, month: 7, day: 1.5 }, { year: 5787, month: 99, day: 1 },
        { year: 5787, month: 6, day: 30 }, { year: 100000, month: 7, day: 1 },
      ].map(hebrewDate => ({ ...valid, target: { ...valid.target, hebrewDate } })),
    ]) expect(notificationCalendarTarget(extra)).toBeNull();
  });

  it('does not resend a passed reminder or notify about non-action calendar markers', () => {
    expect(calendarReminders([event(DayType.SEVEN_CLEAN, date)], new Date(2026, 9, 25, 9))).toEqual([]);
    expect(calendarReminders([event(DayType.MAHZOR, date), event(DayType.MUTERET, date)], now)).toEqual([]);
  });

  it('limits pending notifications to the nearest 60 days', () => {
    const events = Array.from({ length: 90 }, (_, n) => event(DayType.HAFLAGA_DAY, new Date(2026, 9, 25 + n, 12)));
    const reminders = calendarReminders(events.reverse(), now);
    expect(reminders.length).toBe(MAX_PENDING_REMINDERS);
    expect(reminders[0].schedule!.at).toEqual(new Date(2026, 9, 25, 9));
    expect(new Set(reminders.map(r => r.id)).size).toBe(MAX_PENDING_REMINDERS);
  });

  it('uses civil dates across month/year and DST transitions without mutating events', () => {
    for (const date of [new Date(2027, 0, 1, 12), new Date(2026, 2, 27, 12), new Date(2026, 9, 25, 12)]) {
      const concern = event(DayType.MIKVEH_DAY, date, true);
      const before = JSON.stringify(concern);
      const [reminder] = calendarReminders([concern], new Date(2025, 0, 1));
      const expected = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1, 9);
      expect(reminder.schedule!.at).toEqual(expected);
      expect(JSON.stringify(concern)).toBe(before);
    }
  });
});
