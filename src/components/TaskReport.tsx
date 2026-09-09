import { useEffect, useState } from 'react';
import { Camera, ImageOff } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { CardGlowLine } from '@/components/ui/Card';

type Props = {
  open: boolean;
  onClose: () => void;
  taskName: string;
  taskIcon?: string;
  pointsEarned?: number | null;
  completedAt?: string | null;
  photoUrl?: string | null;
};

function formatCompleted(iso: string): string {
  return new Date(iso).toLocaleString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** The "queeste rapport" a completed task opens into, proof photo included. */
export function TaskReport({
  open,
  onClose,
  taskName,
  taskIcon = '⚔️',
  pointsEarned,
  completedAt,
  photoUrl,
}: Props) {
  const [imageState, setImageState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    if (open) setImageState('loading');
  }, [open, photoUrl]);

  return (
    <Modal open={open} onClose={onClose} title={taskName}>
      <div className="space-y-6 p-4 pb-10 sm:p-6">
        {/* Report header card */}
        <div className="overflow-hidden rounded-lg border-2 border-primary bg-gradient-to-br from-secondary/20 to-primary/10 shadow-glow">
          <CardGlowLine />
          <div className="flex items-center gap-4 p-4">
            <span aria-hidden="true" className="text-5xl">
              {taskIcon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-extrabold tracking-[0.2em] text-primary">
                🐉 QUEESTE RAPPORT
              </p>
              <h3 className="text-glow truncate text-xl font-black text-ink">{taskName}</h3>
              <p className="mt-0.5 text-sm text-muted">
                {completedAt ? `✅ ${formatCompleted(completedAt)}` : 'Datum onbekend'}
              </p>
            </div>
          </div>

          {pointsEarned != null && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-4">
              <span className="rounded-full border-2 border-accent bg-accent/15 px-4 py-1 text-sm font-extrabold text-accent">
                +{pointsEarned} XP verdiend ⭐
              </span>
              <span className="text-glow-sm text-sm font-black text-success">✅ GESLAAGD</span>
            </div>
          )}
        </div>

        {/* Proof photo */}
        <section className="space-y-2">
          <h4 className="text-xs font-extrabold tracking-[0.2em] text-secondary">📸 BEWIJS FOTO</h4>

          {!photoUrl ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-edge bg-card-elevated py-12 text-center">
              <Camera className="size-10 text-muted" aria-hidden="true" />
              <p className="font-bold text-muted">Geen bewijs foto</p>
              <p className="text-xs text-muted">Deze queeste had geen foto vereist</p>
            </div>
          ) : imageState === 'error' ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-edge bg-card-elevated py-12 text-center">
              <ImageOff className="size-10 text-muted" aria-hidden="true" />
              <p className="font-bold text-muted">Foto kon niet laden</p>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-lg border-2 border-edge bg-card-elevated">
              {imageState === 'loading' && (
                <div className="absolute inset-0 grid place-items-center">
                  <div className="size-10 animate-spin rounded-full border-[3px] border-edge border-t-primary" />
                </div>
              )}
              <img
                src={photoUrl}
                alt={`Bewijsfoto voor ${taskName}`}
                loading="lazy"
                decoding="async"
                onLoad={() => setImageState('ready')}
                onError={() => setImageState('error')}
                className="max-h-[55dvh] w-full object-cover"
              />
            </div>
          )}
        </section>

        <p className="px-4 text-center text-sm italic leading-relaxed text-muted">
          ✨ &ldquo;Een held bewijst haar kracht met daden, niet met woorden.&rdquo; ✨
        </p>
      </div>
    </Modal>
  );
}
