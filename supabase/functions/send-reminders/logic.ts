import { LAST_NUDGE_HOUR, SAD_NUDGES } from '../_shared/reminderMessages.ts';

/**
 * The pure half of `send-reminders`: given a schedule and a moment in
 * someone's time zone, which reminder (if any) is due right now?
 *
 * No I/O and no Deno APIs, so it can be tested with plain Node.
 */

export type RecurrenceType = 'once' | 'daily' | 'weekly' | 'monthly';

export type ScheduleLike = {
  recurrence_type: RecurrenceType;
  recurrence_day: number | null;
  once_date: string | null;
  /** "HH:MM" or "HH:MM:SS", a wall-clock time on the user's device. */
  time_of_day: string;
};

export type LocalMoment = {
  /** YYYY-MM-DD */
  date: string;
  /** Minutes since local midnight. */
  minutes: number;
  /** 0 = Sunday, like Date.getDay(). */
  dayOfWeek: number;
  /** 1..31, like Date.getDate(). */
  dayOfMonth: number;
};

/**
 * A slot fires during this many minutes after its time. The cron runs every
 * minute; the slack covers a late or skipped run. reminder_log keeps it to
 * one push per slot either way.
 */
export const CATCH_UP_MINUTES = 10;

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** The wall clock in `timeZone` at `now`. Falls back to Brussels on a bad zone. */
export function localMoment(now: Date, timeZone: string): LocalMoment {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
      hourCycle: 'h23',
    }).formatToParts(now);
  } catch {
    return localMoment(now, 'Europe/Brussels');
  }
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const day = Number(get('day'));
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
    dayOfWeek: WEEKDAYS[get('weekday')] ?? 0,
    dayOfMonth: day,
  };
}

/** Same rule as isDueToday in the app. */
export function isDueOn(schedule: ScheduleLike, at: LocalMoment): boolean {
  switch (schedule.recurrence_type) {
    case 'once':
      return schedule.once_date === at.date;
    case 'daily':
      return true;
    case 'weekly':
      return schedule.recurrence_day === at.dayOfWeek;
    case 'monthly':
      return schedule.recurrence_day === at.dayOfMonth;
    default:
      return false;
  }
}

/**
 * Which slot is due now: 0 for the reminder at the scheduled time, 1..maxSlot
 * for the hourly sad nudges after it (never past LAST_NUDGE_HOUR). Null when
 * nothing is due at this minute.
 */
export function dueSlot(schedule: ScheduleLike, at: LocalMoment, maxSlot = SAD_NUDGES): number | null {
  if (!isDueOn(schedule, at)) return null;
  const [h, m] = schedule.time_of_day.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  const base = h * 60 + m;

  for (let slot = 0; slot <= maxSlot; slot++) {
    const fireAt = base + slot * 60;
    if (slot > 0 && fireAt > LAST_NUDGE_HOUR * 60) break;
    if (at.minutes >= fireAt && at.minutes < fireAt + CATCH_UP_MINUTES) return slot;
  }
  return null;
}
