import { supabase } from '@/lib/supabase';
import type { Bounty, TaskInstance, TaskScheduleWithTemplate } from '@/types';
import { getDateString, getHoursPastSchedule, getMonthKey } from '@/utils/date';

/**
 * Het Prijzenbord — unclaimed quests.
 *
 * A template with `user_id IS NULL` is a bounty rather than a bug: nobody owns
 * it, anyone can take it, and the XP goes to whoever gets there first.
 */

/** Cap on the late bonus, so a quest left for a week is not worth a fortune. */
export const MAX_BOUNTY_BONUS = 5;

/** +1 XP per full hour past the scheduled time. The job nobody wants slowly
 *  becomes the job worth taking. */
export function bonusForHoursLate(hoursLate: number): number {
  if (hoursLate <= 0) return 0;
  return Math.min(MAX_BOUNTY_BONUS, Math.floor(hoursLate));
}

function isDueToday(schedule: TaskScheduleWithTemplate, todayStr: string): boolean {
  const today = new Date();
  if (schedule.recurrence_type === 'once') return schedule.once_date === todayStr;
  if (schedule.recurrence_type === 'daily') return true;
  if (schedule.recurrence_type === 'weekly') return schedule.recurrence_day === today.getDay();
  if (schedule.recurrence_type === 'monthly') return schedule.recurrence_day === today.getDate();
  return false;
}

/**
 * Today's open bounties. Instances are created on demand — the board is
 * usually the first thing that asks for them.
 */
export async function getOpenBounties(): Promise<Bounty[]> {
  const todayStr = getDateString();
  const monthKey = getMonthKey();

  const { data: schedules, error } = await supabase
    .from('task_schedules')
    .select('*, task_templates!task_template_id(*)')
    .eq('is_active', true);

  if (error) throw error;

  const bountySchedules = ((schedules ?? []) as TaskScheduleWithTemplate[]).filter(
    (s) =>
      s.task_templates?.is_active &&
      !s.task_templates?.is_deleted &&
      s.task_templates?.user_id === null &&
      isDueToday(s, todayStr)
  );

  if (bountySchedules.length === 0) return [];

  // One query for every existing instance, rather than one per schedule.
  const { data: existing } = await supabase
    .from('task_instances')
    .select('*')
    .eq('due_date', todayStr)
    .in(
      'schedule_id',
      bountySchedules.map((s) => s.id)
    );

  const bySchedule = new Map((existing ?? []).map((i) => [i.schedule_id, i]));

  const missing = bountySchedules.filter((s) => !bySchedule.has(s.id));
  if (missing.length > 0) {
    const { data: created } = await supabase
      .from('task_instances')
      .upsert(
        missing.map((s) => ({
          schedule_id: s.id,
          due_date: todayStr,
          month_key: monthKey,
        })),
        { onConflict: 'schedule_id,due_date', ignoreDuplicates: false }
      )
      .select();

    for (const instance of created ?? []) bySchedule.set(instance.schedule_id, instance);
  }

  const out: Bounty[] = [];
  for (const schedule of bountySchedules) {
    const instance = bySchedule.get(schedule.id);
    if (!instance) continue;
    // Claimed or already done means it is off the board.
    if (instance.claimed_by || instance.completed_at) continue;

    const hoursLate = getHoursPastSchedule(schedule.time_of_day);
    out.push({
      instance,
      schedule,
      template: schedule.task_templates,
      hoursLate,
      bonus: bonusForHoursLate(hoursLate),
    });
  }

  // Biggest bonus first — the board should lead with the dare.
  return out.sort((a, b) => b.bonus - a.bonus || b.template.points - a.template.points);
}

/** Raised when someone else got there first. */
export const BOUNTY_TAKEN = 'BOUNTY_TAKEN';

/**
 * Claim a bounty.
 *
 * The `.is('claimed_by', null)` guard makes this a conditional update, so two
 * members tapping at the same moment cannot both win it: the second update
 * matches no rows. Doing this as read-then-write would hand the quest to both.
 */
export async function claimBounty(instanceId: string, userId: string): Promise<TaskInstance> {
  const { data, error } = await supabase
    .from('task_instances')
    .update({ claimed_by: userId, claimed_at: new Date().toISOString() })
    .eq('id', instanceId)
    .is('claimed_by', null)
    .is('completed_at', null)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error(BOUNTY_TAKEN);
  return data;
}

/** Hand a claimed bounty back to the board. */
export async function releaseBounty(instanceId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('task_instances')
    .update({ claimed_by: null, claimed_at: null })
    .eq('id', instanceId)
    .eq('claimed_by', userId)
    .is('completed_at', null);

  if (error) throw error;
}
