import { supabase } from '@/lib/supabase';
import { getDateString } from '@/utils/date';

/** How the flame is burning right now. */
export type FlameState =
  /** Fed today. Burning. */
  | 'lit'
  /** Missed yesterday but the run is not dead yet — today still saves it. */
  | 'ember'
  /** Out. */
  | 'cold';

export type Streak = {
  /** Consecutive fed days up to and including today (or up to yesterday while embering). */
  current: number;
  /** Best run ever, for bragging rights on the profile. */
  longest: number;
  state: FlameState;
  /** Did the court member already feed the flame today? */
  fedToday: boolean;
  /**
   * Multiplier that will apply to the next quest completed today. Based on the
   * streak *after* that completion, so the number the app shows is the number
   * the player actually gets — no surprise arithmetic.
   */
  multiplier: number;
  /** Last seven days, oldest first, today last. Drives the history strip. */
  recentDays: boolean[];
};

export const EMPTY_STREAK: Streak = {
  current: 0,
  longest: 0,
  state: 'cold',
  fedToday: false,
  multiplier: 1,
  recentDays: [false, false, false, false, false, false, false],
};

/** How far back to look. Bounds the query; longer runs than this stay capped. */
const WINDOW_DAYS = 400;

/**
 * Capped deliberately at 1.5. An uncapped multiplier lets one person run away
 * with the month, which makes the ranking pointless for everybody else — and
 * the three reward tiers are balanced around roughly unmultiplied totals.
 */
export function multiplierFor(streak: number): number {
  if (streak >= 7) return 1.5;
  if (streak >= 3) return 1.2;
  return 1;
}

function shiftDays(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + delta);
  return getDateString(date);
}

/**
 * Turns the set of days this member completed something into a streak.
 * Exported for the unit-test-shaped cases; `getStreak` does the fetching.
 */
export function streakFromDays(fedDays: Set<string>, today = getDateString()): Streak {
  const fedToday = fedDays.has(today);
  const yesterday = shiftDays(today, -1);

  // Walk back from whichever day anchors the live run.
  let anchor: string | null = null;
  let state: FlameState = 'cold';

  if (fedToday) {
    anchor = today;
    state = 'lit';
  } else if (fedDays.has(yesterday)) {
    // The ember day: one built-in grace period. A streak that dies with no
    // warning makes people abandon the app; a near-miss they can still
    // rescue brings them back the same day.
    anchor = yesterday;
    state = 'ember';
  }

  let current = 0;
  if (anchor) {
    let cursor = anchor;
    while (fedDays.has(cursor) && current < WINDOW_DAYS) {
      current += 1;
      cursor = shiftDays(cursor, -1);
    }
  }

  // Longest run anywhere in the window.
  const sorted = [...fedDays].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of sorted) {
    run = prev !== null && shiftDays(prev, 1) === day ? run + 1 : 1;
    if (run > longest) longest = run;
    prev = day;
  }

  // Oldest first so the strip reads left-to-right like a calendar.
  const recentDays: boolean[] = [];
  for (let i = 6; i >= 0; i--) {
    recentDays.push(fedDays.has(shiftDays(today, -i)));
  }

  return {
    current,
    longest: Math.max(longest, current),
    state,
    fedToday,
    multiplier: multiplierFor(fedToday ? current : current + 1),
    recentDays,
  };
}

type ScheduleOwnerRow = { id: string; task_templates: { user_id: string | null } | null };

/** Schedule ids whose template belongs to this member. */
async function ownedScheduleIds(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('task_schedules')
    .select('id, task_templates!task_template_id(user_id)');

  return ((data ?? []) as unknown as ScheduleOwnerRow[])
    .filter((s) => s.task_templates?.user_id === userId)
    .map((s) => s.id);
}

export async function getStreak(userId: string): Promise<Streak> {
  const scheduleIds = await ownedScheduleIds(userId);
  if (scheduleIds.length === 0) return EMPTY_STREAK;

  const since = shiftDays(getDateString(), -WINDOW_DAYS);

  const { data, error } = await supabase
    .from('task_instances')
    .select('completed_at')
    .in('schedule_id', scheduleIds)
    .not('completed_at', 'is', null)
    .gte('due_date', since);

  if (error) throw error;

  // The local calendar day of the completion, not the due date: a quest
  // finished at 00:30 counts for the day it was actually done.
  const fedDays = new Set<string>();
  for (const row of data ?? []) {
    if (row.completed_at) fedDays.add(getDateString(new Date(row.completed_at)));
  }

  return streakFromDays(fedDays);
}
