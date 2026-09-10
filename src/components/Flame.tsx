import { motion } from 'framer-motion';
import type { Streak } from '@/services/streak';
import { cn } from '@/lib/utils';

/** Day initials for the history strip, ending on today. */
function lastSevenLabels(): string[] {
  const short = ['Z', 'M', 'D', 'W', 'D', 'V', 'Z'];
  const out: string[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    out.push(short[d.getDay()]);
  }
  return out;
}

const COPY: Record<Streak['state'], { title: string; hint: string; glyph: string }> = {
  lit: { title: 'Je drakenvuur brandt', hint: '', glyph: '🔥' },
  ember: {
    title: 'Je vuur smeult',
    hint: 'Voltooi vandaag nog één queeste en je reeks blijft leven.',
    glyph: '🔥',
  },
  cold: {
    title: 'Je vuur is uit',
    hint: 'Voltooi een queeste om opnieuw aan te steken.',
    glyph: '🌑',
  },
};

type Props = {
  streak: Streak;
  /** Equipped flame colour from the Schatkamer; falls back to the state tone. */
  colorOverride?: string;
  className?: string;
};

/**
 * Feature 01 — De Vlam. The app already called its points "Drakenvuur" while
 * nothing in the codebase tracked a streak, so the fire meant nothing
 * mechanically. This gives it a height you can lose.
 */
export function Flame({ streak, colorOverride, className }: Props) {
  const { state, current, longest, multiplier, recentDays } = streak;
  const copy = COPY[state];
  const labels = lastSevenLabels();

  // A cold flame stays grey whatever you bought — the point of the state is
  // that it reads as "out" at a glance.
  const tone =
    state === 'cold'
      ? 'var(--hof-border-deep)'
      : (colorOverride ??
        (state === 'lit' ? 'var(--hof-error)' : 'var(--hof-warning)'));

  // The flame physically grows with the run, capped so it cannot eat the card.
  const scale = state === 'cold' ? 1 : Math.min(1.9, 1 + current * 0.07);

  return (
    <section
      aria-label="Drakenvuur reeks"
      className={cn('rounded-lg border bg-card p-4', className)}
      style={{
        borderColor: tone,
        boxShadow: state === 'cold' ? undefined : `0 0 18px -8px ${tone}`,
      }}
    >
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className={cn(
            'grid size-14 shrink-0 place-items-center text-3xl',
            state === 'lit' && 'animate-flame',
            state === 'ember' && 'animate-gutter'
          )}
          style={{ transform: `scale(${scale})`, transformOrigin: 'center bottom' }}
        >
          {copy.glyph}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span
              className="text-glow text-3xl font-black tabular-nums"
              style={{ color: tone }}
            >
              {current}
            </span>
            <span className="text-sm font-bold text-muted">
              {current === 1 ? 'dag op rij' : 'dagen op rij'}
            </span>
            {multiplier > 1 && (
              <span
                className="ml-auto rounded-full border px-2.5 py-0.5 text-xs font-black tabular-nums"
                style={{ borderColor: tone, color: tone }}
              >
                ×{multiplier} XP
              </span>
            )}
          </div>

          <p className="mt-0.5 text-sm font-semibold text-ink">{copy.title}</p>
          {copy.hint && <p className="mt-0.5 text-xs text-muted">{copy.hint}</p>}
        </div>
      </div>

      {/* Seven-day history. A streak number alone is abstract; the strip is
          what makes the gap in the middle of the week visible. */}
      <ol className="mt-4 flex gap-1.5" aria-label="Laatste zeven dagen">
        {recentDays.map((fed, i) => {
          const isToday = i === recentDays.length - 1;
          return (
            <li key={i} className="flex flex-1 flex-col items-center gap-1">
              <motion.span
                initial={{ scaleY: 0.4, opacity: 0 }}
                animate={{ scaleY: 1, opacity: 1 }}
                transition={{ delay: i * 0.04, duration: 0.25 }}
                className="block h-6 w-full rounded-sm border"
                style={{
                  borderColor: fed ? tone : 'var(--hof-border)',
                  backgroundColor: fed
                    ? `color-mix(in srgb, ${tone} 45%, transparent)`
                    : 'transparent',
                }}
                aria-hidden="true"
              />
              <span
                className={cn(
                  'text-[0.6rem] font-bold',
                  isToday ? 'text-ink' : 'text-muted'
                )}
              >
                {labels[i]}
              </span>
              <span className="sr-only">
                {labels[i]}
                {isToday ? ' (vandaag)' : ''}: {fed ? 'voltooid' : 'niets voltooid'}
              </span>
            </li>
          );
        })}
      </ol>

      {longest > current && longest > 1 && (
        <p className="mt-2.5 text-xs text-muted">
          Langste reeks ooit: <strong className="font-bold text-ink">{longest}</strong> dagen
        </p>
      )}
    </section>
  );
}
