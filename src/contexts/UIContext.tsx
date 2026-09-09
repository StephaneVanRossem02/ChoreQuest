import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Web stand-in for React Native's `Alert.alert`. The native app used it for two
 * different jobs, so this splits them: `toast` for "here is what happened", and
 * `confirm` for "are you sure" — the latter returning a promise so callers read
 * top to bottom instead of through a callback.
 */

type ToastTone = 'info' | 'success' | 'error';

type Toast = {
  id: number;
  tone: ToastTone;
  title: string;
  message?: string;
};

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type UIContextValue = {
  toast: (title: string, message?: string, tone?: ToastTone) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const UIContext = createContext<UIContextValue | null>(null);

const TONE_STYLES: Record<ToastTone, { icon: typeof Info; ring: string; text: string }> = {
  info: { icon: Info, ring: 'border-secondary', text: 'text-secondary-light' },
  success: { icon: CheckCircle2, ring: 'border-success', text: 'text-success' },
  error: { icon: AlertTriangle, ring: 'border-error', text: 'text-error' },
};

const TOAST_MS = 5000;

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  const nextId = useRef(0);
  const resolveConfirm = useRef<((value: boolean) => void) | null>(null);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (title: string, message?: string, tone: ToastTone = 'info') => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, tone, title, message }]);
      window.setTimeout(() => dismiss(id), TOAST_MS);
    },
    [dismiss]
  );

  const confirm = useCallback((options: ConfirmOptions) => {
    setConfirmState(options);
    return new Promise<boolean>((resolve) => {
      resolveConfirm.current = resolve;
    });
  }, []);

  const settle = useCallback((answer: boolean) => {
    setConfirmState(null);
    resolveConfirm.current?.(answer);
    resolveConfirm.current = null;
  }, []);

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <UIContext.Provider value={value}>
      {children}

      {/* Toasts */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[120] flex flex-col items-center gap-2 p-4 safe-top"
        role="region"
        aria-label="Meldingen"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const tone = TONE_STYLES[t.tone];
            const Icon = tone.icon;
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: -24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16, scale: 0.96 }}
                transition={{ type: 'spring', damping: 22, stiffness: 320 }}
                role="status"
                aria-live="polite"
                className={cn(
                  'pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-md border bg-card p-3 shadow-glow-lg',
                  tone.ring
                )}
              >
                <Icon className={cn('mt-0.5 size-5 shrink-0', tone.text)} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink">{t.title}</p>
                  {t.message && (
                    <p className="mt-0.5 text-sm break-words text-muted">{t.message}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  className="rounded p-1 text-muted transition-colors hover:text-ink"
                  aria-label="Melding sluiten"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Confirm dialog */}
      <AnimatePresence>
        {confirmState && (
          <motion.div
            className="fixed inset-0 z-[130] flex items-center justify-center bg-[var(--hof-overlay)] p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => settle(false)}
          >
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', damping: 24, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm overflow-hidden rounded-lg border border-primary bg-card shadow-glow-lg"
            >
              <div className="h-1 bg-gradient-to-r from-primary to-secondary" />
              <div className="p-5">
                <h2 id="confirm-title" className="text-lg font-extrabold text-ink">
                  {confirmState.title}
                </h2>
                {confirmState.message && (
                  <p className="mt-2 text-sm leading-relaxed text-muted">{confirmState.message}</p>
                )}
                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    autoFocus
                    onClick={() => settle(false)}
                    className="flex-1 rounded-md border-2 border-edge py-3 text-sm font-bold text-muted transition-colors hover:border-edge-deep hover:text-ink"
                  >
                    {confirmState.cancelLabel ?? 'Annuleer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => settle(true)}
                    className={cn(
                      'flex-[2] rounded-md py-3 text-sm font-extrabold text-white transition-transform active:scale-[0.98]',
                      confirmState.destructive
                        ? 'bg-error'
                        : 'bg-gradient-to-r from-primary to-secondary'
                    )}
                  >
                    {confirmState.confirmLabel ?? 'Bevestigen'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </UIContext.Provider>
  );
}

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used inside UIProvider');
  return ctx;
}
