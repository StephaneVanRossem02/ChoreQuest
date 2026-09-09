import { supabase } from '@/lib/supabase';
import { Reward } from '@/types';

export async function updateReward(id: string, updates: Partial<Reward>): Promise<void> {
  const { error } = await supabase.from('rewards').update(updates).eq('id', id);
  if (error) throw error;
}

export async function getRewards(): Promise<Reward[]> {
  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .order('tier', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export function getNextReward(rewards: Reward[], currentPoints: number): Reward | null {
  return rewards.find((r) => r.points_required > currentPoints) ?? null;
}

export function getCurrentTierReward(rewards: Reward[], tier: number): Reward | null {
  return rewards.find((r) => r.tier === tier) ?? null;
}

export function pointsToNextTier(rewards: Reward[], currentPoints: number): number {
  const next = getNextReward(rewards, currentPoints);
  if (!next) return 0;
  return Math.max(0, next.points_required - currentPoints);
}

export function progressToNextTier(rewards: Reward[], currentPoints: number): number {
  const next = getNextReward(rewards, currentPoints);
  if (!next) return 1;

  const prev = rewards
    .filter((r) => r.points_required <= currentPoints)
    .slice(-1)[0];

  const base = prev?.points_required ?? 0;
  const range = next.points_required - base;
  if (range <= 0) return 1;
  return Math.min(1, (currentPoints - base) / range);
}
