import { cn } from '@/lib/utils';

type Props = { className?: string; label?: string };

/** Full-height loading state, matching the native app's <LoadingSpinner />. */
export function Spinner({ className, label = 'Laden' }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('grid min-h-[50dvh] place-items-center', className)}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative size-12">
          <div className="absolute inset-0 rounded-full border-[3px] border-edge" />
          <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-primary" />
        </div>
        <span className="sr-only">{label}…</span>
      </div>
    </div>
  );
}

/** Inline variant for buttons and rows. */
export function SpinnerDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block size-4 animate-spin rounded-full border-2 border-white/30 border-t-white',
        className
      )}
    />
  );
}
