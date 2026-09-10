/**
 * Which face the header dragon wears.
 *
 * Pure derivation, kept out of DragonMood.tsx so that file exports nothing but
 * its component — otherwise Fast Refresh stops working for it.
 */
export type Mood = 'asleep' | 'watchful' | 'smoking' | 'delighted';

export function moodFor(opts: {
  pendingCount: number;
  completedCount: number;
  overdueCount: number;
}): Mood {
  const { pendingCount, completedCount, overdueCount } = opts;
  if (overdueCount > 0) return 'smoking';
  if (pendingCount === 0 && completedCount > 0) return 'delighted';
  if (pendingCount === 0 && completedCount === 0) return 'asleep';
  return 'watchful';
}
