import { motion } from 'framer-motion';
import type { Mood } from '@/lib/mood';
import { cn } from '@/lib/utils';

/**
 * V3 — the header dragon used to be a static emoji carrying no information.
 * Every value it reacts to is already in `useTodayTasks()`; this is a lookup
 * table over state the app was computing anyway.
 */

const MOODS: Record<
  Mood,
  { glyph: string; puff: string | null; label: string; tone: string }
> = {
  asleep: {
    glyph: '🐉',
    puff: '💤',
    label: 'De draak sluimert — geen queestes vandaag',
    tone: 'var(--hof-text-secondary)',
  },
  watchful: {
    glyph: '🐉',
    puff: null,
    label: 'De draak kijkt toe — er zijn nog queestes open',
    tone: 'var(--hof-primary)',
  },
  smoking: {
    glyph: '🐲',
    puff: '💨',
    label: 'De draak wordt ongeduldig — een queeste is te laat',
    tone: 'var(--hof-error)',
  },
  delighted: {
    glyph: '🐉',
    puff: '✨',
    label: 'De draak is tevreden — alles volbracht',
    tone: 'var(--hof-success)',
  },
};

/** Each mood breathes differently: asleep is slow, smoking is agitated. */
const MOTION: Record<Mood, { y: number[]; rotate: number[]; duration: number }> = {
  asleep: { y: [0, -2, 0], rotate: [0, 0, 0], duration: 4.5 },
  watchful: { y: [0, -4, 0], rotate: [-2, 2, -2], duration: 3 },
  smoking: { y: [0, -2, 0], rotate: [-5, 5, -5], duration: 0.9 },
  delighted: { y: [0, -7, 0], rotate: [-6, 6, -6], duration: 1.5 },
};

type Props = {
  mood: Mood;
  /** Equipped dragon breed from the Schatkamer. */
  glyphOverride?: string;
  className?: string;
  size?: 'sm' | 'lg';
};

export function DragonMood({ mood, glyphOverride, className, size = 'sm' }: Props) {
  const spec = MOODS[mood];
  const anim = MOTION[mood];
  // The smoking mood keeps its own angry glyph: state beats decoration.
  const glyph = mood === 'smoking' ? spec.glyph : (glyphOverride ?? spec.glyph);

  return (
    <span
      className={cn('relative inline-flex shrink-0 items-center', className)}
      role="img"
      aria-label={spec.label}
      title={spec.label}
    >
      <motion.span
        aria-hidden="true"
        className={cn('block leading-none', size === 'lg' ? 'text-4xl' : 'text-lg')}
        animate={{ y: anim.y, rotate: anim.rotate }}
        transition={{ duration: anim.duration, repeat: Infinity, ease: 'easeInOut' }}
        style={{ filter: `drop-shadow(0 0 6px ${spec.tone})` }}
      >
        {glyph}
      </motion.span>

      {spec.puff && (
        <motion.span
          aria-hidden="true"
          className={cn(
            'absolute -top-1 left-full leading-none',
            size === 'lg' ? 'text-xl' : 'text-[0.7rem]'
          )}
          animate={{ opacity: [0, 1, 0], y: [2, -6, -10], x: [0, 2, 4] }}
          transition={{
            duration: mood === 'smoking' ? 1.4 : 2.4,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        >
          {spec.puff}
        </motion.span>
      )}
    </span>
  );
}
