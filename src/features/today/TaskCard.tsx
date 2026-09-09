import { useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Camera, Check, Skull } from 'lucide-react';
import type { TodayTask } from '@/types';
import { TaskReport } from '@/components/TaskReport';
import { SpinnerDot } from '@/components/ui/Spinner';
import { getHoursPastSchedule } from '@/utils/date';
import { cn } from '@/lib/utils';

type Props = {
  task: TodayTask;
  onComplete: (task: TodayTask) => void;
  busy?: boolean;
};

/** Border colour ramps from calm to alarming the longer a task stays open. */
function urgencyColor(hoursPast: number): string {
  if (hoursPast < 0) return 'var(--hof-primary)';
  if (hoursPast < 1) return 'var(--hof-warning)';
  if (hoursPast < 2) return '#C96040';
  if (hoursPast < 3) return 'var(--hof-error)';
  return '#8B1A1A';
}

function urgencyLabel(hoursPast: number): string | null {
  if (hoursPast < 0.1) return null;
  const h = Math.floor(hoursPast);
  return h === 0 ? '⏰ Net begonnen' : `⏰ ${h}u te laat`;
}

const SWIPE_THRESHOLD = 110;

export function TaskCard({ task, onComplete, busy = false }: Props) {
  const { template, instance, schedule, status } = task;
  const [showReport, setShowReport] = useState(false);
  const isCompleted = status === 'completed';

  const hoursPast = status === 'pending' ? getHoursPastSchedule(schedule.time_of_day) : 0;
  const accent =
    status === 'pending'
      ? urgencyColor(hoursPast)
      : status === 'completed'
        ? 'var(--hof-success)'
        : 'var(--hof-error)';
  const lateLabel = status === 'pending' ? urgencyLabel(hoursPast) : null;

  // Swipe-right-to-complete on touch devices; the button covers everyone else.
  const x = useMotionValue(0);
  const swipeOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const canSwipe = status === 'pending' && !busy;

  return (
    <>
      <div className="relative">
        {/* Revealed behind the card while swiping */}
        {canSwipe && (
          <motion.div
            aria-hidden="true"
            style={{ opacity: swipeOpacity }}
            className="pointer-events-none absolute inset-0 flex items-center rounded-md bg-success/20 pl-6"
          >
            <Check className="size-6 text-success" />
            <span className="ml-2 text-sm font-extrabold text-success">Volbracht</span>
          </motion.div>
        )}

        <motion.article
          layout
          drag={canSwipe ? 'x' : false}
          dragConstraints={{ left: 0, right: SWIPE_THRESHOLD + 40 }}
          dragElastic={0.2}
          style={{ x, borderColor: accent, boxShadow: `0 0 14px -4px ${accent}` }}
          onDragEnd={(_, info) => {
            if (info.offset.x > SWIPE_THRESHOLD) {
              onComplete(task);
            }
            animate(x, 0, { type: 'spring', damping: 30, stiffness: 400 });
          }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className={cn(
            'relative overflow-hidden rounded-md border bg-card',
            canSwipe && 'touch-pan-y'
          )}
        >
          <div aria-hidden="true" style={{ backgroundColor: accent }} className="h-0.5 w-full opacity-80" />

          <div className="flex items-center gap-3 p-4">
            <div
              style={{ borderColor: `color-mix(in srgb, ${accent} 40%, transparent)` }}
              className="grid size-12 shrink-0 place-items-center rounded-sm border bg-card-elevated text-2xl"
            >
              <span aria-hidden="true">{template.icon}</span>
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="truncate font-bold text-ink">{template.name}</h3>
              {template.description && (
                <p className="truncate text-sm text-muted">{template.description}</p>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold text-accent">⭐ {template.points} XP</span>
                {template.photo_required && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-secondary-light">
                    <Camera className="size-3" aria-hidden="true" /> Bewijs vereist
                  </span>
                )}
              </div>
            </div>

            <div className="shrink-0">
              {status === 'pending' ? (
                <button
                  type="button"
                  onClick={() => onComplete(task)}
                  disabled={busy}
                  className="rounded-full bg-primary px-4 py-2 text-sm font-extrabold text-white shadow-glow transition-transform hover:brightness-110 active:scale-95 disabled:opacity-60"
                >
                  {busy ? <SpinnerDot /> : '✨ Volbracht'}
                </button>
              ) : (
                <span
                  style={{
                    borderColor: accent,
                    color: accent,
                    backgroundColor: `color-mix(in srgb, ${accent} 13%, transparent)`,
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-xs font-bold"
                >
                  {status === 'completed' ? (
                    <Check className="size-3.5" aria-hidden="true" />
                  ) : (
                    <Skull className="size-3.5" aria-hidden="true" />
                  )}
                  {status === 'completed' ? 'Voltooid' : 'Gemist'}
                </span>
              )}
            </div>
          </div>

          {lateLabel && (
            <div
              style={{
                backgroundColor: `color-mix(in srgb, ${accent} 13%, transparent)`,
                color: accent,
              }}
              className="px-4 py-1 text-center text-xs font-extrabold tracking-wide"
            >
              {lateLabel}
            </div>
          )}

          {isCompleted && (
            <button
              type="button"
              onClick={() => setShowReport(true)}
              className="w-full pb-3 text-center text-xs font-semibold text-accent transition-colors hover:text-accent-light"
            >
              {instance.photo_url
                ? '📸 Bekijk bewijs foto & rapport'
                : '📋 Bekijk queeste rapport'}
            </button>
          )}
        </motion.article>
      </div>

      <TaskReport
        open={showReport}
        onClose={() => setShowReport(false)}
        taskName={template.name}
        taskIcon={template.icon}
        pointsEarned={instance.points_earned}
        completedAt={instance.completed_at}
        photoUrl={instance.photo_url}
      />
    </>
  );
}
