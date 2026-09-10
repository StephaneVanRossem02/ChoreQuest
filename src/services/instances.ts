import { supabase } from '@/lib/supabase';
import { TaskInstance, TaskScheduleWithTemplate, TodayTask, RichTaskInstance } from '@/types';
import { getDateString, getHoursPastSchedule, getMonthKey, hoursBetween, isPast } from '@/utils/date';
import { updateMonthlySummary } from '@/services/summaries';
import { bonusForHoursLate } from '@/services/bounties';
import { probeCapabilities } from '@/lib/capabilities';

function isDueToday(schedule: TaskScheduleWithTemplate, todayStr: string): boolean {
  const today = new Date();
  const dayOfWeek = today.getDay();   // 0=Sun
  const dayOfMonth = today.getDate(); // 1-31

  if (schedule.recurrence_type === 'once') return schedule.once_date === todayStr;
  if (schedule.recurrence_type === 'daily') return true;
  if (schedule.recurrence_type === 'weekly') return schedule.recurrence_day === dayOfWeek;
  if (schedule.recurrence_type === 'monthly') return schedule.recurrence_day === dayOfMonth;
  return false;
}

export async function getTodayTasks(userId: string): Promise<TodayTask[]> {
  const todayStr = getDateString();
  const monthKey = getMonthKey();
  // Awaited rather than read from the cache: this runs on mount alongside
  // AppContext's probe, and reading a not-yet-populated cache would silently
  // drop claimed bounties from the first load. The probe is deduped, so after
  // the first call this costs nothing.
  const { bounties: bountiesEnabled } = await probeCapabilities();

  const { data: schedules, error: schedulesError } = await supabase
    .from('task_schedules')
    .select('*, task_templates!task_template_id(*)')
    .eq('is_active', true);

  if (schedulesError) throw schedulesError;
  if (!schedules || schedules.length === 0) return [];

  const all = schedules as TaskScheduleWithTemplate[];

  const dueSchedules = all.filter(
    (s) => s.task_templates?.is_active &&
           s.task_templates?.user_id === userId &&
           isDueToday(s, todayStr)
  );

  // Claimed bounties belong in today's list too: once you take one off the
  // board it is your quest for the day.
  const bountySchedulesById = new Map(
    all
      .filter((s) => s.task_templates?.is_active && s.task_templates?.user_id === null)
      .map((s) => [s.id, s])
  );

  let claimed: TaskInstance[] = [];
  if (bountiesEnabled && bountySchedulesById.size > 0) {
    const { data } = await supabase
      .from('task_instances')
      .select('*')
      .eq('due_date', todayStr)
      .eq('claimed_by', userId);
    claimed = data ?? [];
  }

  // One query for every instance that already exists, then one bulk upsert for
  // the rest. This used to be a maybeSingle() plus a possible insert per due
  // schedule, which is an N+1 that gets slow as the household grows.
  const existingBySchedule = new Map<string, TaskInstance>();

  if (dueSchedules.length > 0) {
    const { data: existing, error: existingError } = await supabase
      .from('task_instances')
      .select('*')
      .eq('due_date', todayStr)
      .in('schedule_id', dueSchedules.map((s) => s.id));

    if (existingError) throw existingError;
    for (const instance of existing ?? []) existingBySchedule.set(instance.schedule_id, instance);

    const missing = dueSchedules.filter((s) => !existingBySchedule.has(s.id));
    if (missing.length > 0) {
      const { data: created, error: createError } = await supabase
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

      if (createError) throw createError;
      for (const instance of created ?? []) existingBySchedule.set(instance.schedule_id, instance);
    }
  }

  function statusOf(instance: TaskInstance): TodayTask['status'] {
    if (instance.completed_at) return 'completed';
    return isPast(instance.due_date) ? 'missed' : 'pending';
  }

  const results: TodayTask[] = [];

  for (const schedule of dueSchedules) {
    const instance = existingBySchedule.get(schedule.id);
    if (!instance) continue;
    results.push({
      instance,
      schedule,
      template: schedule.task_templates,
      status: statusOf(instance),
      isBounty: false,
      bonus: 0,
    });
  }

  for (const instance of claimed) {
    const schedule = bountySchedulesById.get(instance.schedule_id);
    if (!schedule) continue;
    results.push({
      instance,
      schedule,
      template: schedule.task_templates,
      status: statusOf(instance),
      isBounty: true,
      // Frozen at claim time so the reward cannot drift while it sits in the
      // list: the bonus is what the board advertised when it was taken.
      bonus: bonusForHoursLate(
        instance.claimed_at
          ? hoursBetween(schedule.time_of_day, instance.claimed_at)
          : getHoursPastSchedule(schedule.time_of_day)
      ),
    });
  }

  return results;
}

export async function getInstancesForMonth(monthKey: string): Promise<TaskInstance[]> {
  const { data, error } = await supabase
    .from('task_instances')
    .select('*')
    .eq('month_key', monthKey)
    .order('due_date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Shape returned by the nested select used for the "rich" instance queries. */
type RawRichRow = TaskInstance & {
  task_schedules: {
    task_templates: {
      name: string;
      icon: string;
      points: number;
      user_id: string | null;
    } | null;
  } | null;
};

async function buildRichInstances(rawData: RawRichRow[]): Promise<RichTaskInstance[]> {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, email, avatar_url');
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return rawData.map((item) => {
    const template = item.task_schedules?.task_templates;
    const profile = template?.user_id ? profileMap.get(template.user_id) : undefined;
    const { task_schedules: _schedules, ...rest } = item;
    return {
      ...rest,
      taskName: template?.name ?? '?',
      taskIcon: template?.icon ?? '❓',
      taskPoints: template?.points ?? 0,
      userName: profile?.display_name ?? profile?.email?.split('@')[0] ?? '?',
      userAvatarUrl: profile?.avatar_url ?? null,
      userId: template?.user_id ?? null,
    };
  });
}

export async function getRichInstancesForDate(dateStr: string): Promise<RichTaskInstance[]> {
  const { data, error } = await supabase
    .from('task_instances')
    .select('*, task_schedules!schedule_id(task_templates!task_template_id(name, icon, points, user_id))')
    .eq('due_date', dateStr)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false });
  if (error) throw error;
  return buildRichInstances((data ?? []) as unknown as RawRichRow[]);
}

export async function getRichInstancesForMonth(monthKey: string): Promise<RichTaskInstance[]> {
  const { data, error } = await supabase
    .from('task_instances')
    .select('*, task_schedules!schedule_id(task_templates!task_template_id(name, icon, points, user_id))')
    .eq('month_key', monthKey)
    .order('due_date', { ascending: false });
  if (error) throw error;
  return buildRichInstances((data ?? []) as unknown as RawRichRow[]);
}

export async function completeTaskInstance(
  instanceId: string,
  points: number,
  userId: string,
  photoUrl?: string
): Promise<TaskInstance> {
  const { data, error } = await supabase
    .from('task_instances')
    .update({
      completed_at: new Date().toISOString(),
      points_earned: points,
      photo_url: photoUrl ?? null,
    })
    .eq('id', instanceId)
    .select()
    .single();
  if (error) throw error;

  await updateMonthlySummary(getMonthKey(), userId);
  return data;
}
