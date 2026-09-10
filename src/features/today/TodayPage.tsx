import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { RefreshCw, Scroll } from 'lucide-react';
import { useTodayTasks } from '@/hooks/useInstances';
import { useRewards } from '@/hooks/useRewards';
import { useStreak } from '@/hooks/useStreak';
import { useHouseGoal } from '@/hooks/useHouseGoal';
import { useAppContext } from '@/contexts/AppContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { useUI } from '@/contexts/UIContext';
import { TaskCard } from './TaskCard';
import { CelebrationOverlay } from './CelebrationOverlay';
import { PageHeader } from '@/components/PageHeader';
import { ProgressBar } from '@/components/ProgressBar';
import { EmptyState } from '@/components/EmptyState';
import { Flame } from '@/components/Flame';
import { DragonMood } from '@/components/DragonMood';
import { moodFor } from '@/lib/mood';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import type { TodayTask } from '@/types';
import { completeTaskInstance } from '@/services/instances';
import { NO_PHOTO, takeAndUploadPhoto } from '@/services/storage';
import { rescheduleAllNotifications } from '@/services/notifications';
import { getOpenBounties } from '@/services/bounties';
import { getHoursPastSchedule } from '@/utils/date';
import { errorMessage } from '@/lib/utils';

type Celebration = {
  taskName: string;
  points: number;
  tierUp: { name: string; emoji: string } | null;
  multiplier: number;
};

/** Within this many XP of the next tier the progress bar starts breathing. */
const NEAR_TIER_XP = 10;

export function TodayPage() {
  const { user } = useAuthContext();
  const { tasks, loading, error, refresh, pendingCount, completedCount } = useTodayTasks();
  const { currentPoints, currentTier, nextReward, progress, pointsLeft } = useRewards();
  const { rewards, capabilities, cosmetics, cosmeticValue, refreshSummary } = useAppContext();
  const { streak, refresh: refreshStreak } = useStreak();
  const { goal, threat, refresh: refreshGoal } = useHouseGoal();
  const { toast } = useUI();

  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);
  const [openBounties, setOpenBounties] = useState(0);

  // Just the count, for the entry card. The board itself does the real work.
  const countBounties = useCallback(async () => {
    if (!capabilities.bounties) return;
    try {
      setOpenBounties((await getOpenBounties()).length);
    } catch {
      setOpenBounties(0);
    }
  }, [capabilities.bounties]);

  useEffect(() => {
    countBounties();
  }, [countBounties]);

  const today = new Date().toLocaleDateString('nl-BE', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const overdueCount = useMemo(
    () =>
      tasks.filter(
        (t) => t.status === 'pending' && getHoursPastSchedule(t.schedule.time_of_day) > 0
      ).length,
    [tasks]
  );

  const mood = moodFor({ pendingCount, completedCount, overdueCount });
  const nearTier = nextReward !== null && pointsLeft > 0 && pointsLeft <= NEAR_TIER_XP;

  async function handleComplete(task: TodayTask) {
    if (completing || !user) return;
    setCompleting(task.instance.id);
    try {
      let photoUrl: string | undefined;

      if (task.template.photo_required) {
        try {
          photoUrl = await takeAndUploadPhoto(task.instance.id);
        } catch (photoErr) {
          const msg = errorMessage(photoErr);
          if (msg === NO_PHOTO) {
            setCompleting(null);
            return;
          }
          toast(
            '📷 Foto upload mislukt',
            `${msg} — de queeste wordt voltooid zonder bewijs foto.`,
            'error'
          );
        }
      }

      // Face value plus any bounty bonus, then the flame multiplier on top.
      // Rounded, never below the base, so neither can ever cost you XP.
      const base = task.template.points + task.bonus;
      const awarded = Math.max(base, Math.round(base * streak.multiplier));

      await completeTaskInstance(task.instance.id, awarded, user.id, photoUrl);

      // Did this completion cross a tier? Worked out before the refresh so we
      // compare against the tier the member held a moment ago.
      const crossed = rewards
        .filter((r) => r.points_required > currentPoints)
        .find((r) => currentPoints + awarded >= r.points_required);
      const tierUp =
        crossed && crossed.tier > currentTier
          ? { name: crossed.name, emoji: crossed.emoji }
          : null;

      await Promise.all([
        refresh(),
        refreshSummary(),
        refreshStreak(),
        refreshGoal(),
        countBounties(),
      ]);
      rescheduleAllNotifications().catch(() => {});

      setCelebration({
        taskName: task.template.name,
        points: awarded,
        tierUp,
        multiplier: streak.multiplier,
      });
    } catch (e) {
      toast('Fout', errorMessage(e, 'Queeste voltooien mislukt'), 'error');
    } finally {
      setCompleting(null);
    }
  }

  if (loading && tasks.length === 0) return <Spinner />;

  return (
    <>
      <PageHeader
        eyebrow={
          <>
            <DragonMood mood={mood} glyphOverride={cosmeticValue(cosmetics.dragon)} />
            <span>HOF DER DRAKEN</span>
          </>
        }
        title="Hofqueestes"
        subtitle={today}
      />

      {/* Stat chips */}
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="rounded-full border-2 border-success bg-card px-4 py-1 text-sm font-bold text-success">
          ✅ {completedCount} voltooid
        </span>
        <span className="rounded-full border-2 border-primary bg-card px-4 py-1 text-sm font-bold text-primary">
          {pendingCount} bezig
        </span>
        {overdueCount > 0 && (
          <span className="rounded-full border-2 border-error bg-card px-4 py-1 text-sm font-bold text-error">
            ⏰ {overdueCount} te laat
          </span>
        )}
      </div>

      {/* De Vlam */}
      <Flame
        streak={streak}
        colorOverride={cosmeticValue(cosmetics.flame)}
        className="mb-4"
      />

      {/* Drakenvuur card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-4 rounded-lg border border-secondary bg-card p-4 shadow-glow"
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-bold text-muted">🔥 Drakenvuur</span>
          <span className="text-glow text-2xl font-black text-accent">{currentPoints}</span>
        </div>
        <ProgressBar
          molten
          nearTier={nearTier}
          progress={progress}
          label={nextReward ? nextReward.name : 'Max rang bereikt!'}
          sublabel={
            nextReward
              ? nearTier
                ? `nog ${pointsLeft} XP tot ${nextReward.name}!`
                : `${pointsLeft} XP nodig`
              : ''
          }
        />
      </motion.div>

      {/* Hofdoel — the shared monthly target */}
      {goal && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.06 }}
          className="mb-6 rounded-lg border border-edge bg-card-deep p-4"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-sm font-bold text-muted">
              🏰 Hofdoel <span className="text-xs">({goal.memberCount} hofleden)</span>
            </span>
            <span className="shrink-0 text-sm font-black tabular-nums text-ink">
              {goal.total} / {goal.target}
            </span>
          </div>
          <ProgressBar
            progress={goal.progress}
            color="var(--hof-primary)"
            height={10}
            label={goal.reached ? '🎉 Het hof heeft het doel gehaald!' : 'Samen deze maand'}
          />

          {/* Het Beest. Phrased for the house and never for a person — no
              names, no per-member counts. See getHouseThreat(). */}
          {threat.awake && (
            <div className="mt-3 flex items-start gap-2.5 rounded-md border border-error bg-card p-3">
              <span aria-hidden="true" className="animate-gutter text-xl leading-none">
                🐲
              </span>
              <p className="text-xs leading-relaxed text-muted">
                <strong className="font-bold text-error">Het Beest is ontwaakt.</strong> Er bleven
                deze week {threat.missed} queestes liggen in het hof, en het beest heeft{' '}
                <strong className="font-bold text-ink">{threat.eaten} XP</strong> van het Hofdoel
                opgegeten. Werk samen om het te verjagen.
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Prijzenbord entry. The bottom bar is full at six targets, so this is
          how the board is reached on a phone. */}
      {capabilities.bounties && openBounties > 0 && (
        <Link
          to="/bounties"
          className="mb-6 flex items-center gap-3 rounded-lg border border-secondary bg-card p-4 shadow-glow transition-transform hover:scale-[1.01] active:scale-[0.99]"
        >
          <Scroll className="size-7 shrink-0 text-secondary" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block font-extrabold text-ink">
              {openBounties} vrije {openBounties === 1 ? 'queeste' : 'queestes'} op het Prijzenbord
            </span>
            <span className="block text-xs text-muted">
              Niemand heeft deze opgenomen — wie het eerst komt
            </span>
          </span>
          <span aria-hidden="true" className="shrink-0 text-secondary">
            →
          </span>
        </Link>
      )}

      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-error bg-card p-3">
          <p className="text-sm text-error">{error}</p>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="size-3.5" aria-hidden="true" />
            Opnieuw
          </Button>
        </div>
      )}

      {tasks.length > 0 && (
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-extrabold tracking-[0.2em] text-secondary">
            // MISSIES VAN VANDAAG
          </h2>
          <Button variant="ghost" size="sm" onClick={refresh} aria-label="Vernieuwen">
            <RefreshCw className="size-4" aria-hidden="true" />
          </Button>
        </div>
      )}

      {tasks.length === 0 ? (
        <EmptyState
          emoji="🌙"
          title="Geen missies vandaag"
          subtitle="Voeg queestes toe via Taken om XP te verdienen."
        />
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.instance.id}
              task={task}
              onComplete={handleComplete}
              busy={completing === task.instance.id}
              multiplier={streak.multiplier}
              frameColor={cosmeticValue(cosmetics.frame)}
            />
          ))}
        </div>
      )}

      <CelebrationOverlay
        open={celebration !== null}
        taskName={celebration?.taskName ?? ''}
        pointsEarned={celebration?.points ?? 0}
        tierUp={celebration?.tierUp ?? null}
        multiplier={celebration?.multiplier ?? 1}
        onDismiss={() => setCelebration(null)}
      />
    </>
  );
}
