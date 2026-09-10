import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { getAllProfiles } from '@/services/profiles';
import { getWeeklyChampion, rankForXP, type WeeklyChampion } from '@/services/progression';
import { supabase } from '@/lib/supabase';
import { getMonthKey } from '@/utils/date';
import { PageHeader } from '@/components/PageHeader';
import { Avatar } from '@/components/Avatar';
import { EmberField } from '@/components/EmberField';
import { EmptyState } from '@/components/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';
import { useUI } from '@/contexts/UIContext';
import { errorMessage } from '@/lib/utils';

type RankEntry = {
  id: string;
  name: string;
  avatarUrl: string | null;
  points: number;
  completed: number;
  tier: number;
  /** Cumulative XP over every month — drives the lifetime rank chip. */
  lifetimeXP: number;
  /** Equipped title id from the Schatkamer, if any. */
  titleId?: string;
};

const TIER_MEDAL: Record<number, string> = { 0: '', 1: '🥉', 2: '🥈', 3: '🥇' };
const POSITION_COLORS = ['var(--hof-gold)', 'var(--hof-silver)', 'var(--hof-bronze)'];

/** Podium heights, in the order 2nd, 1st, 3rd — tallest in the middle. */
const PODIUM_ORDER = [1, 0, 2] as const;

export function RankingPage() {
  const { user } = useAuthContext();
  const { capabilities, cosmeticValue } = useAppContext();
  const { toast } = useUI();
  const [entries, setEntries] = useState<RankEntry[]>([]);
  const [champion, setChampion] = useState<WeeklyChampion | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const monthKey = getMonthKey();
      const [profiles, { data: monthSummaries }, { data: allSummaries }, weekly] =
        await Promise.all([
          getAllProfiles(),
          supabase
            .from('monthly_summaries')
            .select('user_id, total_points, tasks_completed, reward_tier')
            .eq('month_key', monthKey),
          // Every month, for the lifetime totals. One extra query rather than
          // one per member.
          supabase.from('monthly_summaries').select('user_id, total_points'),
          getWeeklyChampion().catch(() => null),
        ]);

      const summaryMap = new Map((monthSummaries ?? []).map((s) => [s.user_id, s]));

      const lifetimeMap = new Map<string, number>();
      for (const row of allSummaries ?? []) {
        if (!row.user_id) continue;
        lifetimeMap.set(row.user_id, (lifetimeMap.get(row.user_id) ?? 0) + (row.total_points ?? 0));
      }

      const ranked = profiles
        .map<RankEntry>((p) => {
          const s = summaryMap.get(p.id);
          return {
            id: p.id,
            name: p.display_name ?? p.email ?? p.id.slice(0, 8),
            avatarUrl: p.avatar_url ?? null,
            points: s?.total_points ?? 0,
            completed: s?.tasks_completed ?? 0,
            tier: s?.reward_tier ?? 0,
            lifetimeXP: lifetimeMap.get(p.id) ?? 0,
            titleId: p.cosmetics?.title,
          };
        })
        .sort((a, b) => b.points - a.points);

      setEntries(ranked);
      setChampion(weekly);
    } catch (e) {
      toast('Fout', errorMessage(e, 'Ranking laden mislukt'), 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && entries.length === 0) return <Spinner />;

  const podium = entries.slice(0, 3);
  const hasScores = entries.some((e) => e.points > 0);
  // The podium is a highlight, not a filter: the standings below always list
  // everyone. With a three-person household the old "slice(3)" list was empty,
  // which both looked broken and hid the per-member detail that only these
  // rows carry (completed count, lifetime rank, title).
  const showPodium = hasScores && podium.length >= 3;

  return (
    <>
      <PageHeader
        eyebrow="🏆 HOF DER DRAKEN"
        title="Ranking"
        subtitle="XP deze maand"
        actions={
          <Button variant="ghost" size="icon" onClick={load} aria-label="Ranking vernieuwen">
            <RefreshCw className="size-4" aria-hidden="true" />
          </Button>
        }
      />

      {entries.length === 0 ? (
        <EmptyState emoji="🌙" title="Nog geen activiteit" subtitle="Deze maand is nog jong." />
      ) : (
        <>
          {/* Hofdraak van de Week — a weekly window, because a month is too
              long a horizon for anyone who is behind by day four. */}
          {champion && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              aria-label="Hofdraak van de week"
              className="mb-5 flex items-center gap-3 rounded-lg border border-secondary bg-card p-3.5 shadow-glow"
            >
              <span className="text-2xl" aria-hidden="true">
                🐲
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.65rem] font-extrabold tracking-[0.2em] text-secondary">
                  HOFDRAAK VAN DE WEEK
                </p>
                <p className="truncate font-bold text-ink">{champion.name}</p>
              </div>
              <span className="shrink-0 text-sm font-black tabular-nums text-accent">
                {champion.points} XP
              </span>
            </motion.section>
          )}

          {/* Podium — the top three, with drifting embers. */}
          {showPodium && (
            <section
              aria-label="Top drie"
              className="relative mb-6 overflow-hidden rounded-lg border border-edge bg-card-deep"
            >
              <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                <EmberField color="var(--hof-gold)" />
              </div>

              <ol className="relative grid grid-cols-3 items-end gap-2 p-4 pt-8">
                {PODIUM_ORDER.map((slot) => {
                  const entry = podium[slot];
                  if (!entry) return null;
                  const color = POSITION_COLORS[slot];
                  const height = slot === 0 ? 'h-20' : slot === 1 ? 'h-14' : 'h-10';
                  const isMe = entry.id === user?.id;

                  return (
                    <motion.li
                      key={entry.id}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: slot * 0.1 }}
                      className="flex flex-col items-center gap-2"
                      aria-label={`Plaats ${slot + 1}: ${entry.name}, ${entry.points} XP`}
                    >
                      <Avatar
                        url={entry.avatarUrl}
                        name={entry.name}
                        size={slot === 0 ? 60 : 46}
                        ringClassName="border-2"
                      />
                      <p
                        className={cnTruncate(isMe)}
                        style={{ color: slot === 0 ? color : undefined }}
                      >
                        {entry.name}
                      </p>
                      <span className="text-sm font-black tabular-nums" style={{ color }}>
                        {entry.points}
                      </span>

                      {/* The plinth */}
                      <div
                        className={`flex w-full items-start justify-center rounded-t-md border-x border-t pt-1.5 ${height}`}
                        style={{
                          borderColor: color,
                          backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
                        }}
                      >
                        <span className="text-lg font-black" style={{ color }}>
                          {slot + 1}
                        </span>
                      </div>
                    </motion.li>
                  );
                })}
              </ol>
            </section>
          )}

          {showPodium && (
            <h2 className="mb-3 text-xs font-extrabold tracking-[0.2em] text-secondary">
              // VOLLEDIGE STAND
            </h2>
          )}

          <ol className="space-y-3">
            {entries.map((entry, i) => {
              const absoluteIndex = i;
              const isTop = absoluteIndex < 3;
              const posColor = POSITION_COLORS[absoluteIndex] ?? 'var(--hof-text-secondary)';
              const life = rankForXP(entry.lifetimeXP);
              const title = cosmeticValue(entry.titleId);
              const isMe = entry.id === user?.id;

              return (
                <motion.li
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.06, 0.4) }}
                  style={
                    isTop
                      ? { borderColor: posColor, boxShadow: `0 0 14px -6px ${posColor}` }
                      : isMe
                        ? { borderColor: 'var(--hof-primary)' }
                        : undefined
                  }
                  className="flex items-center gap-3 rounded-md border-2 border-edge bg-card p-4"
                >
                  <span
                    style={{ color: isTop ? posColor : undefined }}
                    className={`w-7 text-center text-lg font-black tabular-nums ${isTop ? '' : 'text-muted'}`}
                  >
                    {absoluteIndex + 1}
                  </span>

                  <Avatar
                    url={entry.avatarUrl}
                    name={entry.name}
                    size={40}
                    ringClassName={isTop ? 'border-2' : undefined}
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink">
                      {TIER_MEDAL[entry.tier]} {entry.name}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                      <span>{entry.completed} voltooid</span>
                      {entry.lifetimeXP > 0 && (
                        <span className="text-secondary">
                          {life.emoji} {life.name}
                        </span>
                      )}
                      {capabilities.hoard && title && (
                        <span className="italic text-accent">{title}</span>
                      )}
                    </p>
                  </div>

                  <span
                    style={{ color: isTop ? posColor : undefined }}
                    className={`shrink-0 text-lg font-black tabular-nums ${isTop ? '' : 'text-accent'}`}
                  >
                    {entry.points} XP
                  </span>
                </motion.li>
              );
            })}
          </ol>
        </>
      )}
    </>
  );
}

/** Podium name styling; separate so the ternary stays out of the JSX. */
function cnTruncate(isMe: boolean): string {
  return `max-w-full truncate text-center text-xs font-bold ${isMe ? 'text-primary' : 'text-ink'}`;
}
