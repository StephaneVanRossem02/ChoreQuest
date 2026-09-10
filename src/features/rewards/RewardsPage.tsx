import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Coins, Lock, Unlock } from 'lucide-react';
import { useRewards } from '@/hooks/useRewards';
import { useAppContext } from '@/contexts/AppContext';
import { PageHeader } from '@/components/PageHeader';
import { ProgressBar, ProgressRing } from '@/components/ProgressBar';
import { LifetimeTrack } from '@/components/LifetimeTrack';
import { TIER_COLOR } from '@/components/TierBadge';
import type { Reward } from '@/types';
import { cn } from '@/lib/utils';

function RewardCard({
  reward,
  currentPoints,
  currentTier,
  index,
}: {
  reward: Reward;
  currentPoints: number;
  currentTier: number;
  index: number;
}) {
  const unlocked = currentTier >= reward.tier;
  const color = TIER_COLOR[reward.tier] ?? 'var(--hof-primary)';
  const remaining = Math.max(0, reward.points_required - currentPoints);

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.07 }}
      style={unlocked ? { borderColor: color, boxShadow: `0 0 18px -6px ${color}` } : undefined}
      className={cn(
        'overflow-hidden rounded-md border bg-card transition-opacity',
        unlocked ? 'border-2' : 'border-edge opacity-55'
      )}
    >
      {unlocked && <div aria-hidden="true" style={{ backgroundColor: color }} className="h-0.5 w-full" />}

      <div className="flex items-center gap-4 p-4">
        <span aria-hidden="true" className="text-4xl">
          {reward.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 style={{ color: unlocked ? color : undefined }} className={cn('font-extrabold', !unlocked && 'text-muted')}>
              {reward.name}
            </h3>
            {unlocked ? (
              <span style={{ color }} className="inline-flex items-center gap-1 text-xs font-extrabold">
                <Unlock className="size-3" aria-hidden="true" /> ONTGRENDELD
              </span>
            ) : (
              <Lock className="size-3.5 text-muted" aria-hidden="true" />
            )}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted">{reward.description}</p>
          <p style={{ color }} className="mt-1 text-sm font-bold">
            ⭐ {reward.points_required} XP vereist
            {!unlocked && (
              <span className="font-normal text-muted"> ({remaining} te gaan)</span>
            )}
          </p>
        </div>
      </div>
    </motion.article>
  );
}

export function RewardsPage() {
  const { rewards, currentPoints, currentTier, nextReward, progress, pointsLeft } = useRewards();
  const { lifetime, capabilities } = useAppContext();
  const nextColor = nextReward ? (TIER_COLOR[nextReward.tier] ?? 'var(--hof-accent)') : 'var(--hof-gold)';
  const currentReward = rewards.find((r) => r.tier === currentTier);

  return (
    <>
      <PageHeader eyebrow="👑 HOF RANG" title="Beloningen" />

      {/* XP hero with the animated ring */}
      <motion.section
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="mb-4 overflow-hidden rounded-lg border border-secondary bg-card shadow-glow-lg"
      >
        <div aria-hidden="true" className="h-[3px] w-full bg-secondary" />
        <div className="flex flex-col items-center gap-4 p-6">
          <ProgressRing progress={progress} size={190} stroke={13} color={nextColor}>
            <div className="flex flex-col items-center">
              <span aria-hidden="true" className="text-3xl">
                ⭐
              </span>
              <span className="text-glow text-5xl font-black leading-none text-accent">
                {currentPoints}
              </span>
              <span className="mt-1 text-xs font-semibold text-muted">🔥 Drakenvuur</span>
            </div>
          </ProgressRing>

          {nextReward ? (
            <div className="w-full max-w-sm">
              <ProgressBar
                progress={progress}
                label={nextReward.name}
                sublabel={`${pointsLeft} XP nodig`}
                color={nextColor}
              />
            </div>
          ) : (
            <p className="text-glow text-lg font-extrabold text-gold">👑 HOOGSTE HOF RANG!</p>
          )}
        </div>
      </motion.section>

      {currentTier > 0 && currentReward && (
        <div
          style={{
            borderColor: TIER_COLOR[currentTier],
            boxShadow: `0 0 14px -6px ${TIER_COLOR[currentTier]}`,
          }}
          className="mb-4 rounded-md border-2 bg-card p-4 text-center"
        >
          <p style={{ color: TIER_COLOR[currentTier] }} className="text-base">
            Jouw rang: <span className="font-extrabold">{currentReward.name}</span>
          </p>
        </div>
      )}

      <h2 className="mb-3 text-xs font-extrabold tracking-[0.2em] text-secondary">
        // HOFRANGORDE — DEZE MAAND
      </h2>

      <div className="space-y-3">
        {rewards.map((reward, i) => (
          <RewardCard
            key={reward.id}
            reward={reward}
            currentPoints={currentPoints}
            currentTier={currentTier}
            index={i}
          />
        ))}
      </div>

      <h2 className="mb-1 mt-8 text-xs font-extrabold tracking-[0.2em] text-secondary">
        // WAT BLIJFT
      </h2>
      <p className="mb-3 text-xs text-muted">
        Deze twee tellen door, ook na de 1e van de maand.
      </p>

      <LifetimeTrack lifetime={lifetime} />

      {/* The bottom bar has no room for the Schatkamer on a phone, so this is
          its way in there. On desktop it also sits in the sidebar. */}
      {capabilities.hoard && (
        <Link
          to="/hoard"
          className="mt-4 flex items-center gap-3 rounded-lg border border-accent bg-card p-4 transition-transform hover:scale-[1.01] active:scale-[0.99]"
        >
          <Coins className="size-7 shrink-0 text-accent" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block font-extrabold text-ink">Schatkamer</span>
            <span className="block text-xs text-muted">
              Munten uitgeven aan vlamkleuren, draken en titels
            </span>
          </span>
          <span aria-hidden="true" className="shrink-0 text-accent">
            →
          </span>
        </Link>
      )}

      <p className="py-6 text-center text-sm text-muted">
        Je maand-XP reset; je drakenrang en zegels niet. De draak beloont de dappere! 🐉
      </p>
    </>
  );
}
