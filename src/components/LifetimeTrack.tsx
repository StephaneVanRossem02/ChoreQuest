import { motion } from 'framer-motion';
import { ProgressBar } from '@/components/ProgressBar';
import { SEAL_UNLOCKS, type LifetimeStats } from '@/services/progression';
import { cn } from '@/lib/utils';

type Props = {
  lifetime: LifetimeStats;
  className?: string;
};

/**
 * Tracks 2 and 3 — the halves of progression that never reset.
 *
 * The monthly tiers stay exactly as they were, because they map to a real
 * agreement in the family (bath night, spa day, weekend trip). This sits
 * alongside them so a good month leaves a permanent trace instead of being
 * wiped on the 1st.
 */
export function LifetimeTrack({ lifetime, className }: Props) {
  const { xp, rank, next, progress, toNext, seals, monthsPlayed } = lifetime;

  return (
    <section className={cn('space-y-4', className)}>
      {/* Lifetime rank */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32 }}
        className="rounded-lg border border-secondary bg-card p-4"
      >
        <div className="mb-3 flex items-center gap-3">
          <span aria-hidden="true" className="text-3xl">
            {rank.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.65rem] font-extrabold tracking-[0.2em] text-secondary">
              DRAKENRANG — RESET NOOIT
            </p>
            <p className="truncate text-lg font-black text-ink">{rank.name}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-glow text-xl font-black tabular-nums text-accent">{xp}</p>
            <p className="text-[0.65rem] text-muted">XP ooit</p>
          </div>
        </div>

        {next ? (
          <ProgressBar
            molten
            progress={progress}
            color="var(--hof-secondary)"
            height={10}
            label={`${next.emoji} ${next.name}`}
            sublabel={`${toNext} XP te gaan`}
          />
        ) : (
          <p className="text-glow text-center text-sm font-extrabold text-gold">
            👑 Hoogste drakenrang bereikt
          </p>
        )}

        {monthsPlayed > 0 && (
          <p className="mt-2.5 text-xs text-muted">
            Opgebouwd over{' '}
            <strong className="font-bold text-ink">
              {monthsPlayed} {monthsPlayed === 1 ? 'maand' : 'maanden'}
            </strong>
          </p>
        )}
      </motion.div>

      {/* Seals */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, delay: 0.06 }}
        className="rounded-lg border border-edge bg-card-deep p-4"
      >
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <p className="text-[0.65rem] font-extrabold tracking-[0.2em] text-secondary">
            DRAKENZEGELS
          </p>
          <p className="shrink-0 text-sm font-black tabular-nums text-ink">{seals}</p>
        </div>

        <p className="mb-3 text-xs text-muted">
          Eén zegel voor elke maand die je op de hoogste rang afsluit.
        </p>

        <ol className="flex flex-wrap gap-2">
          {SEAL_UNLOCKS.map((unlock) => {
            const earned = seals >= unlock.seals;
            return (
              <li
                key={unlock.seals}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold',
                  earned
                    ? 'border-gold text-gold'
                    : 'border-edge text-muted opacity-70'
                )}
              >
                <span aria-hidden="true">{earned ? '🐲' : '🔒'}</span>
                {unlock.seals} — {unlock.label}
              </li>
            );
          })}
        </ol>
      </motion.div>
    </section>
  );
}
