import { useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type Props = {
  open: boolean;
  taskName: string;
  pointsEarned: number;
  /** Set when this completion also crossed into a new reward tier. */
  tierUp?: { name: string; emoji: string } | null;
  /** Streak multiplier that was applied, if any. */
  multiplier?: number;
  onDismiss: () => void;
};

/**
 * Three dragons fly in from off-screen, hover, and cheer while the "queeste
 * voltooid" card flips in. Ported beat for beat from the native Animated
 * version, with the card gaining a 3D flip now that we have real perspective.
 *
 * The ceremony is proportional to the win. Every completion used to fire the
 * identical 2.8s three-dragon sequence, so washing two plates got the same
 * fanfare as scrubbing the bathroom and the whole thing stopped registering
 * after a few days. Now the scale of the moment matches what it cost.
 */
const DRAGONS = [
  { action: '👍', flip: false, from: { x: '-60vw', y: -80 }, to: { x: -140, y: -90 }, delay: 0 },
  { action: '😘', flip: true, from: { x: '60vw', y: 60 }, to: { x: 140, y: 60 }, delay: 0.12 },
  { action: '🔥', flip: false, from: { x: 0, y: '60vh' }, to: { x: 0, y: -180 }, delay: 0.24 },
] as const;

const FIRE = ['🔥', '✨', '🔥', '💛', '🔥'];
const STORM = ['🔥', '✨', '💛', '⭐', '🔥', '✨', '💫', '🔥', '⭐', '✨', '💛', '🔥'];

type Ceremony = {
  /** How many of the three dragons turn up. */
  dragons: number;
  /** Auto-dismiss delay. */
  ms: number;
  /** Fire burst from the third dragon. */
  burst: boolean;
  /** Screen-wide ember sweep. */
  storm: boolean;
  eyebrow: string;
};

function ceremonyFor(points: number, tierUp: boolean): Ceremony {
  if (tierUp) {
    return { dragons: 3, ms: 4200, burst: true, storm: true, eyebrow: 'NIEUWE RANG' };
  }
  if (points >= 5) {
    return { dragons: 3, ms: 3400, burst: true, storm: true, eyebrow: 'GROTE QUEESTE VOLTOOID' };
  }
  if (points >= 3) {
    return { dragons: 3, ms: 2800, burst: true, storm: false, eyebrow: 'QUEESTE VOLTOOID' };
  }
  // A small chore gets a nod, not a parade — and gets out of the way fast.
  return { dragons: 1, ms: 1100, burst: false, storm: false, eyebrow: 'VOLBRACHT' };
}

export function CelebrationOverlay({
  open,
  taskName,
  pointsEarned,
  tierUp = null,
  multiplier = 1,
  onDismiss,
}: Props) {
  const ceremony = useMemo(
    () => ceremonyFor(pointsEarned, tierUp !== null),
    [pointsEarned, tierUp]
  );

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(onDismiss, ceremony.ms);
    return () => window.clearTimeout(timer);
  }, [open, onDismiss, ceremony.ms]);

  const label = tierUp
    ? `Nieuwe rang bereikt: ${tierUp.name}. Queeste ${taskName} voltooid, plus ${pointsEarned} XP`
    : `Queeste voltooid: ${taskName}, plus ${pointsEarned} XP`;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[110] grid place-items-center overflow-hidden bg-[var(--hof-overlay)] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDismiss}
          role="alertdialog"
          aria-live="assertive"
          aria-label={label}
        >
          {/* Screen-wide ember sweep, only for a 5-XP quest or a tier-up. */}
          {ceremony.storm &&
            STORM.map((particle, i) => {
              const left = (i / STORM.length) * 100 + (i % 2 === 0 ? 3 : -3);
              return (
                <motion.span
                  key={`storm-${i}`}
                  aria-hidden="true"
                  className="pointer-events-none absolute text-2xl"
                  style={{ left: `${Math.min(94, Math.max(2, left))}%` }}
                  initial={{ bottom: '-10%', opacity: 0, rotate: 0 }}
                  animate={{
                    bottom: '110%',
                    opacity: [0, 1, 1, 0],
                    rotate: i % 2 === 0 ? 40 : -40,
                  }}
                  transition={{
                    duration: 2.2 + (i % 4) * 0.35,
                    delay: 0.1 + i * 0.07,
                    ease: 'easeOut',
                  }}
                >
                  {particle}
                </motion.span>
              );
            })}

          {/* Dragons */}
          {DRAGONS.slice(0, ceremony.dragons).map((dragon, i) => (
            <motion.div
              key={dragon.action}
              aria-hidden="true"
              className="pointer-events-none absolute grid place-items-center"
              initial={{ ...dragon.from, scale: 0, opacity: 0 }}
              animate={{
                x: dragon.to.x,
                y: [dragon.to.y, dragon.to.y - 14, dragon.to.y],
                scale: 1,
                opacity: 1,
              }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{
                x: { type: 'spring', damping: 12, stiffness: 160, delay: dragon.delay },
                scale: { type: 'spring', damping: 8, stiffness: 200, delay: dragon.delay },
                opacity: { duration: 0.15, delay: dragon.delay },
                y: {
                  duration: 1 + i * 0.12,
                  repeat: Infinity,
                  repeatType: 'loop',
                  ease: 'easeInOut',
                  delay: dragon.delay + 0.5,
                },
              }}
            >
              <span
                className="block text-6xl"
                style={{ transform: dragon.flip ? 'scaleX(-1)' : undefined }}
              >
                🐉
              </span>
              <span
                className={`absolute -top-3 rounded-full border-2 border-secondary bg-card px-2 py-1 text-xl ${
                  dragon.flip ? '-left-4' : '-right-4'
                }`}
              >
                {dragon.action}
              </span>

              {/* Fire burst from the third dragon */}
              {ceremony.burst &&
                i === 2 &&
                FIRE.map((particle, fi) => {
                  const angle = (fi / FIRE.length) * Math.PI * 1.4 - 0.7;
                  const dist = 50 + fi * 20;
                  return (
                    <motion.span
                      key={fi}
                      className="absolute text-xl"
                      initial={{ x: 0, y: 0, opacity: 0 }}
                      animate={{
                        x: Math.cos(angle) * dist,
                        y: -Math.abs(Math.sin(angle) * dist) - 20,
                        opacity: [0, 1, 1, 0],
                      }}
                      transition={{ duration: 0.7, delay: 0.35 + fi * 0.04 }}
                    >
                      {particle}
                    </motion.span>
                  );
                })}
            </motion.div>
          ))}

          {/* Central card — flips in on its Y axis */}
          <div className="relative" style={{ perspective: 1200 }}>
            <motion.div
              initial={{ rotateY: -95, opacity: 0, scale: 0.8 }}
              animate={{ rotateY: 0, opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', damping: 14, stiffness: 160 }}
              className="preserve-3d w-[min(20rem,85vw)] overflow-hidden rounded-xl border border-primary bg-gradient-to-b from-card-elevated to-card shadow-glow-lg"
            >
              <div aria-hidden="true" className="h-1 w-full bg-gradient-to-r from-primary to-secondary" />
              <div className="flex flex-col items-center gap-3 px-6 pb-8 pt-5 text-center">
                <p className="text-glow text-xs font-black tracking-[0.35em] text-primary">
                  {ceremony.eyebrow}
                </p>

                {/* A tier-up mints its badge in the middle of the card. */}
                {tierUp && (
                  <motion.div
                    initial={{ scale: 0, rotate: -25, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    transition={{ delay: 0.45, type: 'spring', damping: 9, stiffness: 200 }}
                    className="flex flex-col items-center gap-1"
                  >
                    <span className="text-glow text-5xl" aria-hidden="true">
                      {tierUp.emoji}
                    </span>
                    <span className="text-glow text-lg font-black text-accent">{tierUp.name}</span>
                  </motion.div>
                )}

                <p className="text-lg font-extrabold text-ink">{taskName}</p>

                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, type: 'spring', damping: 10, stiffness: 240 }}
                  className="mt-1 flex items-center gap-3 rounded-full border border-accent bg-bg px-5 py-2"
                >
                  <span className="text-sm font-semibold text-muted">XP verdiend</span>
                  <span className="text-glow text-xl font-black text-accent">
                    +{pointsEarned} ⭐
                  </span>
                </motion.div>

                {multiplier > 1 && (
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55 }}
                    className="text-xs font-bold text-error"
                  >
                    🔥 Drakenvuur ×{multiplier} toegepast
                  </motion.p>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
