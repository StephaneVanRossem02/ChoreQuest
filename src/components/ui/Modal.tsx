import { useEffect, useId, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** 'sheet' slides up from the bottom (the native app's modal feel); 'center' scales in. */
  variant?: 'sheet' | 'center';
  className?: string;
  children: React.ReactNode;
};

export function Modal({ open, onClose, title, variant = 'sheet', className, children }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Escape to close, and keep the page behind from scrolling under the sheet.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  // Move focus into the dialog so keyboard and screen-reader users land inside it.
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  const sheet = variant === 'sheet';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={cn(
            'fixed inset-0 z-[100] flex bg-[var(--hof-overlay)] backdrop-blur-sm',
            sheet ? 'items-end justify-center' : 'items-center justify-center p-4'
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            onClick={(e) => e.stopPropagation()}
            initial={sheet ? { y: '100%' } : { opacity: 0, scale: 0.94, y: 12 }}
            animate={sheet ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={sheet ? { y: '100%' } : { opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={cn(
              'flex max-h-[88dvh] w-full flex-col overflow-hidden border border-primary bg-card outline-none',
              sheet ? 'max-w-2xl rounded-t-xl border-b-0' : 'max-w-lg rounded-lg',
              className
            )}
          >
            <div aria-hidden="true" className="h-1 shrink-0 bg-gradient-to-r from-primary to-secondary" />
            {title && (
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-edge px-5 py-4">
                <h2 id={titleId} className="text-lg font-black text-ink">
                  {title}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Sluiten"
                  className="grid size-9 shrink-0 place-items-center rounded-full border border-edge bg-card-elevated text-muted transition-colors hover:border-primary hover:text-primary"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
