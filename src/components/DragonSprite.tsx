import { useId } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * De draak die met je meegroeit.
 *
 * Tied to the lifetime rank (track 2), so the thing on screen is a picture of
 * progress that never resets.
 *
 * Drawn head-on as a heraldic crest rather than a side view of a whole
 * creature. Two reasons, both learned the hard way: a three-quarter body built
 * from ellipses reads as a lump with a beak, and a symmetric design can be
 * authored as one half and mirrored — so it is half the path data and it
 * cannot come out lopsided. A crest also suits a court far better than a
 * cartoon animal does.
 */

type Stage = 0 | 1 | 2 | 3 | 4;

type Props = {
  /** Lifetime rank tier, 0–4. */
  stage: number;
  /** Flame colour from the Schatkamer; falls back to the ember accent. */
  flameColor?: string;
  size?: number;
  animated?: boolean;
  className?: string;
};

type Spec = {
  /** Head scale inside the viewBox. */
  scale: number;
  /** 0 = nubs, 1 = full sweep, 2 = full sweep plus a second pair. */
  horns: 0 | 1 | 2;
  jawSpikes: boolean;
  fangs: boolean;
  crown: boolean;
  /** Glow behind the crest. */
  aura: number;
  label: string;
};

const SPECS: Record<Stage, Spec> = {
  0: { scale: 0, horns: 0, jawSpikes: false, fangs: false, crown: false, aura: 0.25, label: 'Een ei' },
  1: { scale: 0.72, horns: 0, jawSpikes: false, fangs: false, crown: false, aura: 0.3, label: 'Een jonge draak' },
  2: { scale: 0.88, horns: 1, jawSpikes: false, fangs: true, crown: false, aura: 0.55, label: 'Een vuurdraak' },
  3: { scale: 0.96, horns: 1, jawSpikes: true, fangs: true, crown: false, aura: 0.75, label: 'Een hofdraak' },
  4: { scale: 1, horns: 2, jawSpikes: true, fangs: true, crown: true, aura: 1, label: 'Een drakenheer' },
};

function clampStage(n: number): Stage {
  const i = Math.round(n);
  return (i < 0 ? 0 : i > 4 ? 4 : i) as Stage;
}

export function DragonSprite({
  stage,
  flameColor,
  size = 120,
  animated = true,
  className,
}: Props) {
  const s = clampStage(stage);
  const spec = SPECS[s];
  const flame = flameColor ?? 'var(--hof-accent)';

  // Several sprites can share a page (ranking, profile), so every gradient and
  // symbol id has to be unique or the last one wins for all of them.
  const uid = useId().replace(/:/g, '');
  const half = `half-${uid}`;
  const scales = `scales-${uid}`;
  const glow = `glow-${uid}`;

  // ── Het ei ───────────────────────────────────────────────────────────────
  if (s === 0) {
    return (
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        role="img"
        aria-label={spec.label}
        className={cn('block', className)}
      >
        <defs>
          <radialGradient id={scales} cx="38%" cy="28%">
            <stop offset="0%" stopColor="var(--hof-card-elevated)" />
            <stop offset="100%" stopColor="var(--hof-primary-dark)" />
          </radialGradient>
        </defs>

        <ellipse cx="50" cy="90" rx="22" ry="3.5" fill="var(--hof-border)" opacity="0.5" />

        <motion.g
          animate={
            animated
              ? { rotate: [-2.5, 2.5, -2.5], transition: { duration: 3.6, repeat: Infinity, ease: 'easeInOut' } }
              : undefined
          }
          style={{ transformOrigin: '50px 86px' }}
        >
          <ellipse cx="50" cy="56" rx="25" ry="31" fill={`url(#${scales})`} stroke={flame} strokeWidth="1.6" />
          <polyline
            points="44,34 50,44 43,50 51,60 45,70"
            fill="none"
            stroke={flame}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="58" cy="45" r="2" fill={flame} opacity="0.6" />
          <circle cx="40" cy="63" r="1.5" fill={flame} opacity="0.4" />
        </motion.g>
      </svg>
    );
  }

  const k = spec.scale;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={spec.label}
      className={cn('block', className)}
    >
      <defs>
        <linearGradient id={scales} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--hof-primary-light)" />
          <stop offset="55%" stopColor="var(--hof-primary)" />
          <stop offset="100%" stopColor="var(--hof-primary-dark)" />
        </linearGradient>

        <radialGradient id={glow}>
          <stop offset="0%" stopColor={flame} stopOpacity="0.55" />
          <stop offset="70%" stopColor={flame} stopOpacity="0.12" />
          <stop offset="100%" stopColor={flame} stopOpacity="0" />
        </radialGradient>

        {/* One half of the crest, mirrored below. Everything here lives left
            of the centre line at x=50. */}
        <g id={half}>
          {/* Horn — a tapered sweep up and out */}
          {spec.horns >= 1 && (
            <path
              d="M 33 28 Q 16 22 3 26 Q 15 20 22 8 Q 26 20 38 25 Z"
              fill={flame}
              stroke="var(--hof-primary-dark)"
              strokeWidth="1"
              strokeLinejoin="round"
            />
          )}
          {/* Second, shorter pair for the crowned stage */}
          {spec.horns >= 2 && (
            <path
              d="M 26 41 Q 12 44 2 40 Q 15 41 24 33 Z"
              fill={flame}
              opacity="0.85"
              stroke="var(--hof-primary-dark)"
              strokeWidth="0.8"
              strokeLinejoin="round"
            />
          )}
          {/* Nub horns for the hatchling */}
          {spec.horns === 0 && (
            <path d="M 34 29 Q 24 26 18 20 Q 28 24 39 26 Z" fill={flame} opacity="0.9" />
          )}

          {/* Brow ridge */}
          <path
            d="M 25 42 L 44 47"
            stroke="var(--hof-primary-dark)"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.75"
          />

          {/* Cheek spikes */}
          {spec.jawSpikes && (
            <path
              d="M 22 50 l -9 -4 l 8 9 M 26 62 l -9 3 l 9 4"
              stroke={flame}
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Nostril */}
          <ellipse cx="45" cy="73" rx="2.4" ry="1.7" fill="var(--hof-primary-dark)" opacity="0.85" />

          {/* Fang */}
          {spec.fangs && <path d="M 42 80 L 46 80 L 44 88 Z" fill="var(--hof-card-elevated)" />}
        </g>
      </defs>

      {/* Aura behind the crest */}
      <circle cx="50" cy="52" r="46" fill={`url(#${glow})`} opacity={spec.aura} />

      <motion.g
        animate={
          animated
            ? { scale: [1, 1.035, 1], transition: { duration: 3.4, repeat: Infinity, ease: 'easeInOut' } }
            : undefined
        }
        style={{ transformOrigin: '50px 52px' }}
        transform={`translate(50 52) scale(${k}) translate(-50 -52)`}
      >
        {/* The skull is drawn ONCE as a whole shape. Mirroring it drew its
            closing edge twice and left a stroked seam down the nose. Only the
            decoration is mirrored. */}
        <path
          d="M 50 21 L 31 27 L 20 44 L 26 61 L 39 70 L 41 84 L 50 89 L 59 84 L 61 70 L 74 61 L 80 44 L 69 27 Z"
          fill={`url(#${scales})`}
          stroke="var(--hof-primary-dark)"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />

        <use href={`#${half}`} />
        <use href={`#${half}`} transform="translate(100 0) scale(-1 1)" />

        {/* Eyes sit on the centre line's own layer so they can blink together */}
        <motion.g
          animate={
            animated
              ? { scaleY: [1, 1, 0.08, 1], transition: { duration: 4.8, repeat: Infinity, times: [0, 0.9, 0.95, 1] } }
              : undefined
          }
          style={{ transformOrigin: '50px 52px' }}
        >
          <path d="M 26 48 L 43 53 L 40 59 L 27 55 Z" fill={flame} />
          <path d="M 74 48 L 57 53 L 60 59 L 73 55 Z" fill={flame} />
          <circle cx="34" cy="54" r="1.5" fill="var(--hof-bg)" opacity="0.85" />
          <circle cx="66" cy="54" r="1.5" fill="var(--hof-bg)" opacity="0.85" />
        </motion.g>

        {/* Crown */}
        {spec.crown && (
          <g>
            <path
              d="M 34 22 L 39 10 L 45 17 L 50 5 L 55 17 L 61 10 L 66 22 Z"
              fill="var(--hof-gold)"
              stroke="var(--hof-secondary)"
              strokeWidth="1.1"
              strokeLinejoin="round"
            />
            <circle cx="50" cy="15" r="2" fill={flame} />
          </g>
        )}

        {/* Breath, from between the fangs */}
        {spec.fangs && (
          <motion.g
            animate={
              animated
                ? { opacity: [0.25, 0.9, 0.4, 0.85, 0.25], scaleY: [0.85, 1.2, 0.9, 1.1, 0.85], transition: { duration: 1.7, repeat: Infinity, ease: 'easeInOut' } }
                : undefined
            }
            style={{ transformOrigin: '50px 90px' }}
          >
            <ellipse cx="50" cy="94" rx="8" ry="4.2" fill={flame} opacity="0.8" />
            <ellipse cx="50" cy="94" rx="4" ry="2.2" fill="var(--hof-card-elevated)" opacity="0.6" />
          </motion.g>
        )}
      </motion.g>
    </svg>
  );
}
