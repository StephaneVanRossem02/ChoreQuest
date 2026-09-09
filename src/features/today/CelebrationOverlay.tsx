import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type Props = {
  open: boolean;
  taskName: string;
  pointsEarned: number;
  onDismiss: () => void;
};

/**
 * Three dragons fly in from off-screen, hover, and cheer while the "queeste
 * voltooid" card flips in. Ported beat for beat from the native Animated
 * version, with the card gaining a 3D flip now that we have real perspective.
 */
const DRAGONS = [
  { action: '👍', flip: false, from: { x: '-60vw', y: -80 }, to: { x: -140, y: -90 }, delay: 0 },
  { action: '😘', flip: true, from: { x: '60vw', y: 60 }, to: { x: 140, y: 60 }, delay: 0.12 },
  { action: '🔥', flip: false, from: { x: 0, y: '60vh' }, to: { x: 0, y: -180 }, delay: 0.24 },
] as const;

const FIRE = ['🔥', '✨', '🔥', '💛', '🔥'];
const DISMISS_MS = 2800;

export function CelebrationOverlay({ open, taskName, pointsEarned, onDismiss }: Props) {
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(onDismiss, DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [open, onDismiss]);

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
          aria-label={`Queeste voltooid: ${taskName}, plus ${pointsEarned} XP`}
        >
          {/* Dragons */}
          {DRAGONS.map((dragon, i) => (
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
              {i === 2 &&
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
                  QUEESTE VOLTOOID
                </p>
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
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
