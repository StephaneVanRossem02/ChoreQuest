import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { requestNotificationPermissions } from '@/services/notifications';
import { cn } from '@/lib/utils';

const ONBOARDING_KEY = 'chorequest_onboarding_done';

export function isOnboardingDone(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === 'true';
  } catch {
    // If storage is unavailable, don't trap the user in onboarding forever.
    return true;
  }
}

export function markOnboardingDone(): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, 'true');
  } catch {
    // Non-fatal.
  }
}

const SLIDES = [
  {
    emoji: '🐉',
    title: 'Welkom in het Hof!',
    body: 'Jij bent de heldin van het Hof der Draken. Voltooi hofqueestes, verdien Drakenvuur XP en stijg in rang!',
    color: 'var(--hof-primary)',
  },
  {
    emoji: '🌹',
    title: 'Voltooi Queestes',
    body: 'Elke taak is een queeste. Sommige vereisen een bewijs foto als offer aan de draak. Geen bewijs? Geen XP!',
    color: 'var(--hof-accent2)',
  },
  {
    emoji: '👑',
    title: 'Stijg in Hofrang',
    body: 'Van Hofdame → Ridder → Drakenkoningin. Hoe meer Drakenvuur, hoe groter de beloning van het Hof!',
    color: 'var(--hof-accent)',
  },
  {
    emoji: '🕯️',
    title: 'Mis Geen Queeste',
    body: 'Zet herinneringen aan en de draak fluistert je naam. Jouw rang in het Hof hangt ervan af!',
    color: 'var(--hof-secondary-light)',
  },
] as const;

export function OnboardingPage({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  async function handleNext() {
    if (!isLast) {
      setDirection(1);
      setIndex((i) => i + 1);
      return;
    }
    // Ask for notification permission from a real click, which is the only
    // moment browsers will honour the request.
    await requestNotificationPermissions().catch(() => false);
    markOnboardingDone();
    onDone();
  }

  function handleBack() {
    setDirection(-1);
    setIndex((i) => Math.max(0, i - 1));
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-bg-deep via-bg to-card p-6 safe-top safe-bottom">
      {/* Progress dots */}
      <div className="flex justify-center gap-2 pt-4">
        {SLIDES.map((s, i) => (
          <span
            key={s.title}
            aria-hidden="true"
            style={i === index ? { backgroundColor: slide.color } : undefined}
            className={cn(
              'h-2 rounded-full transition-all duration-300',
              i === index ? 'w-6' : 'w-2 bg-edge'
            )}
          />
        ))}
      </div>

      <div className="flex flex-1 items-center justify-center">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={slide.title}
            custom={direction}
            initial={{ opacity: 0, x: direction * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -60 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex max-w-md flex-col items-center gap-6 text-center"
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} van ${SLIDES.length}`}
          >
            <span
              aria-hidden="true"
              style={{ filter: `drop-shadow(0 0 30px ${slide.color})` }}
              className="text-8xl motion-safe:animate-float"
            >
              {slide.emoji}
            </span>
            <h1
              style={{ color: slide.color, textShadow: `0 0 14px ${slide.color}` }}
              className="text-2xl font-black tracking-wide sm:text-3xl"
            >
              {slide.title}
            </h1>
            <p className="text-base leading-relaxed text-muted">{slide.body}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-end gap-3 pb-4">
        {index > 0 && (
          <Button variant="ghost" size="lg" onClick={handleBack}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Terug
          </Button>
        )}
        <Button
          size="lg"
          onClick={handleNext}
          style={{ backgroundImage: `linear-gradient(to right, ${slide.color}, var(--hof-secondary))` }}
          className="rounded-full"
        >
          {isLast ? 'Betreed het Hof! 🐉' : 'Volgende →'}
        </Button>
      </div>
    </div>
  );
}
