import { supabase } from '@/lib/supabase';
import { getDateString, getMonthKey } from '@/utils/date';

/**
 * Track 2 — lifetime rank. The app's only progression used to be
 * `monthly_summaries`, which is keyed by month and wiped on the 1st, so the
 * harder someone played in March the more they lost in April. This ladder
 * never resets and never spends.
 *
 * It needs no new table: it is a sum over rows that were already being written.
 */
export type LifetimeRank = {
  tier: number;
  name: string;
  emoji: string;
  required: number;
};

export const LIFETIME_RANKS: LifetimeRank[] = [
  { tier: 0, name: 'Ei', emoji: '🥚', required: 0 },
  { tier: 1, name: 'Jonge Draak', emoji: '🐣', required: 250 },
  { tier: 2, name: 'Vuurdraak', emoji: '🔥', required: 1000 },
  { tier: 3, name: 'Hofdraak', emoji: '🐉', required: 2500 },
  { tier: 4, name: 'Drakenheer', emoji: '👑', required: 5000 },
];

export function rankForXP(xp: number): LifetimeRank {
  let found = LIFETIME_RANKS[0];
  for (const rank of LIFETIME_RANKS) {
    if (xp >= rank.required) found = rank;
  }
  return found;
}

export function nextRankForXP(xp: number): LifetimeRank | null {
  return LIFETIME_RANKS.find((r) => r.required > xp) ?? null;
}

/** 0–1 progress through the current lifetime rank band. */
export function rankProgress(xp: number): number {
  const next = nextRankForXP(xp);
  if (!next) return 1;
  const base = rankForXP(xp).required;
  const span = next.required - base;
  if (span <= 0) return 1;
  return Math.min(1, Math.max(0, (xp - base) / span));
}

export type LifetimeStats = {
  xp: number;
  rank: LifetimeRank;
  next: LifetimeRank | null;
  progress: number;
  /** XP still needed for the next rank; 0 at the top. */
  toNext: number;
  /** Months closed at the top reward tier. */
  seals: number;
  monthsPlayed: number;
};

export const EMPTY_LIFETIME: LifetimeStats = {
  xp: 0,
  rank: LIFETIME_RANKS[0],
  next: LIFETIME_RANKS[1],
  progress: 0,
  toNext: LIFETIME_RANKS[1].required,
  seals: 0,
  monthsPlayed: 0,
};

export async function getLifetimeStats(userId: string): Promise<LifetimeStats> {
  const { data, error } = await supabase
    .from('monthly_summaries')
    .select('month_key, total_points, reward_tier')
    .eq('user_id', userId);

  if (error) throw error;

  const rows = data ?? [];
  const currentMonth = getMonthKey();

  const xp = rows.reduce((sum, r) => sum + (r.total_points ?? 0), 0);

  // A seal is banked when a month CLOSES at the top tier, so the month in
  // progress does not count yet — otherwise it would appear and vanish.
  const seals = rows.filter((r) => r.reward_tier === 3 && r.month_key !== currentMonth).length;

  const next = nextRankForXP(xp);

  return {
    xp,
    rank: rankForXP(xp),
    next,
    progress: rankProgress(xp),
    toNext: next ? Math.max(0, next.required - xp) : 0,
    seals,
    monthsPlayed: rows.length,
  };
}

/** Cosmetic unlocks earned purely by banking seals, no coins involved. */
export const SEAL_UNLOCKS = [
  { seals: 1, label: 'Eerste zegel' },
  { seals: 3, label: 'Vlamkleur' },
  { seals: 6, label: 'Kaartlijst' },
  { seals: 12, label: 'Permanente kroon' },
] as const;

/**
 * Track: Hofdoel. One shared monthly bar summing every member's XP, with the
 * individual ranking left untouched alongside it — cooperative and competitive
 * at the same time. The target scales with the size of the household so a
 * family of two is not chasing a family of five's number.
 */
export type HouseGoal = {
  total: number;
  target: number;
  progress: number;
  memberCount: number;
  reached: boolean;
};

export async function getHouseGoal(perMemberTarget: number): Promise<HouseGoal> {
  const monthKey = getMonthKey();

  const [{ count }, { data: summaries, error }] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('monthly_summaries').select('total_points').eq('month_key', monthKey),
  ]);

  if (error) throw error;

  const memberCount = Math.max(1, count ?? 1);
  const total = (summaries ?? []).reduce((sum, s) => sum + (s.total_points ?? 0), 0);
  const target = Math.max(1, memberCount * perMemberTarget);

  return {
    total,
    target,
    progress: Math.min(1, total / target),
    memberCount,
    reached: total >= target,
  };
}

/**
 * Hofdraak van de Week. A month is too long a horizon for a child who is
 * behind by day four; a weekly window gives them a fresh, winnable race.
 */
export type WeeklyChampion = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  points: number;
};

type WeekRow = {
  points_earned: number | null;
  completed_at: string | null;
  task_schedules: { task_templates: { user_id: string | null } | null } | null;
};

export async function getWeeklyChampion(): Promise<WeeklyChampion | null> {
  const since = new Date();
  since.setDate(since.getDate() - 6);

  const { data, error } = await supabase
    .from('task_instances')
    .select(
      'points_earned, completed_at, task_schedules!schedule_id(task_templates!task_template_id(user_id))'
    )
    .not('completed_at', 'is', null)
    .gte('due_date', getDateString(since));

  if (error) throw error;

  const totals = new Map<string, number>();
  for (const row of (data ?? []) as unknown as WeekRow[]) {
    const owner = row.task_schedules?.task_templates?.user_id;
    if (!owner) continue;
    totals.set(owner, (totals.get(owner) ?? 0) + (row.points_earned ?? 0));
  }

  let bestId: string | null = null;
  let bestPoints = 0;
  for (const [id, points] of totals) {
    if (points > bestPoints) {
      bestId = id;
      bestPoints = points;
    }
  }

  if (!bestId || bestPoints === 0) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, email, avatar_url')
    .eq('id', bestId)
    .maybeSingle();

  return {
    userId: bestId,
    name: profile?.display_name ?? profile?.email?.split('@')[0] ?? 'Onbekend',
    avatarUrl: profile?.avatar_url ?? null,
    points: bestPoints,
  };
}

/**
 * Het Beest — a shared threat.
 *
 * If the court as a whole leaves too many quests undone in a week, a wild
 * dragon wakes and eats part of the Hofdoel. Shared jeopardy is a strong
 * cooperation driver.
 *
 * DESIGN CONSTRAINT, deliberate and load-bearing: this counts misses for the
 * HOUSE and never per person, and nothing it returns can be attributed to an
 * individual. A mechanic that publicly names the weakest contributor in a
 * family gets one child scapegoated by their siblings, which is a worse
 * outcome than an unmopped floor. If you extend this, do not add a breakdown.
 */
export type HouseThreat = {
  awake: boolean;
  /** Total quests the household left undone in the last seven days. */
  missed: number;
  /** How many misses the court is allowed before the beast stirs. */
  tolerance: number;
  /** XP the beast has eaten from the shared goal. */
  eaten: number;
};

export const CALM_BEAST: HouseThreat = { awake: false, missed: 0, tolerance: 0, eaten: 0 };

/** XP removed from the house goal per miss beyond tolerance. */
const BITE_PER_MISS = 5;

export async function getHouseThreat(
  memberCount: number,
  goalTarget: number
): Promise<HouseThreat> {
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const today = getDateString();

  const { data, error } = await supabase
    .from('task_instances')
    .select('id, due_date, completed_at')
    .is('completed_at', null)
    .gte('due_date', getDateString(since))
    .lt('due_date', today);

  if (error) throw error;

  const missed = (data ?? []).length;

  // Two forgiven misses per member per week. A household is allowed a bad day.
  const tolerance = Math.max(2, memberCount * 2);
  const over = Math.max(0, missed - tolerance);

  // Never more than a quarter of the target, so the bar cannot be made to look
  // hopeless — a goal that reads as unreachable stops motivating anyone.
  const eaten = Math.min(Math.round(goalTarget * 0.25), over * BITE_PER_MISS);

  return { awake: over > 0 && eaten > 0, missed, tolerance, eaten };
}
