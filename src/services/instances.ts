import { supabase } from '@/lib/supabase';
import { TaskInstance, TaskScheduleWithTemplate, TodayTask, RichTaskInstance } from '@/types';
import { getDateString, getMonthKey, isPast } from '@/utils/date';
import { updateMonthlySummary } from '@/services/summaries';

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

  const { data: schedules, error: schedulesError } = await supabase
    .from('task_schedules')
    .select('*, task_templates!task_template_id(*)')
    .eq('is_active', true);

  if (schedulesError) throw schedulesError;
  if (!schedules || schedules.length === 0) return [];

  const dueSchedules = (schedules as TaskScheduleWithTemplate[]).filter(
    (s) => s.task_templates?.is_active &&
           s.task_templates?.user_id === userId &&
           isDueToday(s, todayStr)
  );

  const results: TodayTask[] = [];

  for (const schedule of dueSchedules) {
    const { data: existing } = await supabase
      .from('task_instances')
      .select('*')
      .eq('schedule_id', schedule.id)
      .eq('due_date', todayStr)
      .maybeSingle();

    let instance: TaskInstance;

    if (existing) {
      instance = existing;
    } else {
      const { data: created, error: createError } = await supabase
        .from('task_instances')
        .insert({ schedule_id: schedule.id, due_date: todayStr, month_key: monthKey })
        .select()
        .single();
      if (createError) throw createError;
      instance = created;
    }

    const status = instance.completed_at
      ? 'completed'
      : isPast(instance.due_date)
      ? 'missed'
      : 'pending';

    results.push({ instance, schedule, template: schedule.task_templates, status });
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
