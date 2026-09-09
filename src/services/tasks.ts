import { supabase } from '@/lib/supabase';
import { TaskTemplate, TaskTemplateInsert, TaskTemplateUpdate } from '@/types';

export async function getTaskTemplates(includeInactive = false, userId?: string): Promise<TaskTemplate[]> {
  let query = supabase
    .from('task_templates')
    .select('*')
    .order('created_at', { ascending: true });
  if (!includeInactive) {
    query = query.eq('is_active', true);
  }
  if (userId) {
    query = query.eq('user_id', userId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).filter((t) => !t.is_deleted);
}

export async function getTaskTemplate(id: string): Promise<TaskTemplate> {
  const { data, error } = await supabase
    .from('task_templates')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createTaskTemplate(template: TaskTemplateInsert): Promise<TaskTemplate> {
  const { data, error } = await supabase
    .from('task_templates')
    .insert(template)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTaskTemplate(
  id: string,
  updates: TaskTemplateUpdate
): Promise<TaskTemplate> {
  const { data, error } = await supabase
    .from('task_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deactivateTaskTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('task_templates')
    .update({ is_active: false })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteTaskTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('task_templates')
    .update({ is_deleted: true, is_active: false })
    .eq('id', id);
  if (error) throw error;
}

export async function getTaskTemplatesForUser(userId: string): Promise<TaskTemplate[]> {
  const { data, error } = await supabase
    .from('task_templates')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).filter((t) => !t.is_deleted);
}
