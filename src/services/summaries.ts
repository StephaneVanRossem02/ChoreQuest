import { supabase } from '@/lib/supabase';
import { MonthlySummary, RewardTier } from '@/types';
import { getDateString } from '@/utils/date';
import { probeCapabilities } from '@/lib/capabilities';

async function computeRewardTier(totalPoints: number): Promise<RewardTier> {
  const { data } = await supabase
    .from('rewards')
    .select('tier, points_required')
    .order('points_required', { ascending: false });

  if (!data) return 0;

  for (const reward of data) {
    if (totalPoints >= reward.points_required) {
      return reward.tier as RewardTier;
    }
  }
  return 0;
}

export async function updateMonthlySummary(monthKey: string, userId: string): Promise<MonthlySummary> {
  const today = getDateString();
  const { bounties: bountiesEnabled } = await probeCapabilities();

  // Get all schedule IDs for this user's tasks
  type ScheduleOwnerRow = { id: string; task_templates: { user_id: string | null } | null };

  const { data: userSchedules } = await supabase
    .from('task_schedules')
    .select('id, task_templates!task_template_id(user_id)')
    .eq('is_active', true);

  const userScheduleIds = ((userSchedules ?? []) as unknown as ScheduleOwnerRow[])
    .filter((s) => s.task_templates?.user_id === userId)
    .map((s) => s.id);

  type CountedRow = {
    completed_at: string | null;
    points_earned: number | null;
    due_date: string;
  };

  const { data: owned, error } = await supabase
    .from('task_instances')
    .select('completed_at, points_earned, due_date')
    .eq('month_key', monthKey)
    .in('schedule_id', userScheduleIds.length > 0 ? userScheduleIds : ['']);

  if (error) throw error;

  const rows: CountedRow[] = [...(owned ?? [])];

  // A claimed bounty has no template owner, so its XP has to follow the
  // claimer instead. Without this, finishing a bounty would earn nobody
  // anything on the monthly summary.
  if (bountiesEnabled) {
    const { data: claimed, error: claimedError } = await supabase
      .from('task_instances')
      .select('completed_at, points_earned, due_date')
      .eq('month_key', monthKey)
      .eq('claimed_by', userId);

    if (claimedError) throw claimedError;
    rows.push(...(claimed ?? []));
  }

  const completed = rows.filter((i) => i.completed_at !== null);
  const missed = rows.filter((i) => !i.completed_at && i.due_date < today);
  const totalPoints = completed.reduce((sum, i) => sum + (i.points_earned ?? 0), 0);
  const rewardTier = await computeRewardTier(totalPoints);

  const summary = {
    month_key: monthKey,
    user_id: userId,
    total_points: totalPoints,
    tasks_completed: completed.length,
    tasks_missed: missed.length,
    reward_tier: rewardTier,
    updated_at: new Date().toISOString(),
  };

  const { data, error: upsertError } = await supabase
    .from('monthly_summaries')
    .upsert(summary, { onConflict: 'month_key,user_id' })
    .select()
    .single();

  if (upsertError) throw upsertError;
  return data;
}

export async function getMonthlySummary(monthKey: string, userId: string): Promise<MonthlySummary | null> {
  const { data, error } = await supabase
    .from('monthly_summaries')
    .select('*')
    .eq('month_key', monthKey)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getRecentMonthlySummaries(userId: string, count = 12): Promise<MonthlySummary[]> {
  const { data, error } = await supabase
    .from('monthly_summaries')
    .select('*')
    .eq('user_id', userId)
    .order('month_key', { ascending: false })
    .limit(count);
  if (error) throw error;
  return data ?? [];
}
