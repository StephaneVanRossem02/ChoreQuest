import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { getAllProfiles } from '@/services/profiles';
import { supabase } from '@/lib/supabase';
import { getMonthKey } from '@/utils/date';
import { PageHeader } from '@/components/PageHeader';
import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { useUI } from '@/contexts/UIContext';
import { errorMessage } from '@/lib/utils';

type RankEntry = {
  id: string;
  name: string;
  avatarUrl: string | null;
  points: number;
  completed: number;
  tier: number;
};

const TIER_MEDAL: Record<number, string> = { 0: '', 1: '🥉', 2: '🥈', 3: '🥇' };
const POSITION_COLORS = ['var(--hof-gold)', 'var(--hof-silver)', 'var(--hof-bronze)'];

export function RankingPage() {
  const { toast } = useUI();
  const [entries, setEntries] = useState<RankEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const monthKey = getMonthKey();
      const [profiles, { data: summaries }] = await Promise.all([
        getAllProfiles(),
        supabase
          .from('monthly_summaries')
          .select('user_id, total_points, tasks_completed, reward_tier')
          .eq('month_key', monthKey),
      ]);

      const summaryMap = new Map((summaries ?? []).map((s) => [s.user_id, s]));

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
          };
        })
        .sort((a, b) => b.points - a.points);

      setEntries(ranked);
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
        <ol className="space-y-3">
          {entries.map((entry, i) => {
            const isTop = i < 3;
            const posColor = POSITION_COLORS[i] ?? 'var(--hof-text-secondary)';

            return (
              <motion.li
                key={entry.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.06 }}
                style={
                  isTop ? { borderColor: posColor, boxShadow: `0 0 14px -6px ${posColor}` } : undefined
                }
                className="flex items-center gap-3 rounded-md border-2 border-edge bg-card p-4"
              >
                <span
                  style={{ color: isTop ? posColor : undefined }}
                  className={`w-7 text-center text-lg font-black ${isTop ? '' : 'text-muted'}`}
                >
                  {i + 1}
                </span>

                <Avatar
                  url={entry.avatarUrl}
                  name={entry.name}
                  size={40}
                  ringClassName={isTop ? 'border-2' : undefined}
                  className={isTop ? '' : undefined}
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-ink">
                    {TIER_MEDAL[entry.tier]} {entry.name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">{entry.completed} voltooid</p>
                </div>

                <span
                  style={{ color: isTop ? posColor : undefined }}
                  className={`shrink-0 text-lg font-black ${isTop ? '' : 'text-accent'}`}
                >
                  {entry.points} XP
                </span>
              </motion.li>
            );
          })}
        </ol>
      )}
    </>
  );
}
