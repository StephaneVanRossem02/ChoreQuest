import { supabase } from '@/lib/supabase';
import { TaskSchedule, TaskScheduleInsert, TaskScheduleUpdate, TaskScheduleWithTemplate } from '@/types';

export async function getSchedulesForTemplate(templateId: string): Promise<TaskSchedule[]> {
  const { data, error } = await supabase
    .from('task_schedules')
    .select('*')
    .eq('task_template_id', templateId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getAllActiveSchedulesWithTemplates(): Promise<TaskScheduleWithTemplate[]> {
  const { data, error } = await supabase
    .from('task_schedules')
    .select('*, task_templates!task_template_id(*)')
    .eq('is_active', true);
  if (error) throw error;
  return (data ?? []).filter((s) => (s as TaskScheduleWithTemplate).task_templates?.is_active) as TaskScheduleWithTemplate[];
}

export async function createTaskSchedule(schedule: TaskScheduleInsert): Promise<TaskSchedule> {
  const { data, error } = await supabase
    .from('task_schedules')
    .insert(schedule)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTaskSchedule(
  id: string,
  updates: TaskScheduleUpdate
): Promise<TaskSchedule> {
  const { data, error } = await supabase
    .from('task_schedules')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTaskSchedule(id: string): Promise<void> {
  const { error } = await supabase.from('task_schedules').delete().eq('id', id);
  if (error) throw error;
}
