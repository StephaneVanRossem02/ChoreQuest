import { supabase } from '@/lib/supabase';
import { Profile, UserRole } from '@/types';

export async function getOwnProfile(): Promise<Profile | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();
  return data ?? null;
}

export async function getAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function updateProfileRole(id: string, role: UserRole): Promise<void> {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
  if (error) throw error;
}

export async function updateDisplayName(id: string, displayName: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ display_name: displayName }).eq('id', id);
  if (error) throw error;
}

export async function updateAvatarUrl(id: string, avatarUrl: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', id);
  if (error) throw error;
}

/**
 * Web-only: the native app passed the profile through navigation params, but a
 * URL like /admin/users/:id can be opened cold, so the page fetches it itself.
 */
export async function getProfileById(id: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}
