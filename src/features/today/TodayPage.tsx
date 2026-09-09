import { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { useTodayTasks } from '@/hooks/useInstances';
import { useRewards } from '@/hooks/useRewards';
import { useAppContext } from '@/contexts/AppContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { useUI } from '@/contexts/UIContext';
import { TaskCard } from './TaskCard';
import { CelebrationOverlay } from './CelebrationOverlay';
import { PageHeader } from '@/components/PageHeader';
import { ProgressBar } from '@/components/ProgressBar';
import { EmptyState } from '@/components/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import type { TodayTask } from '@/types';
import { completeTaskInstance } from '@/services/instances';
import { NO_PHOTO, takeAndUploadPhoto } from '@/services/storage';
import { rescheduleAllNotifications } from '@/services/notifications';
import { errorMessage } from '@/lib/utils';

type Celebration = { taskName: string; points: number };

export function TodayPage() {
  const { user } = useAuthContext();
  const { tasks, loading, error, refresh, pendingCount, completedCount } = useTodayTasks();
  const { currentPoints, nextReward, progress, pointsLeft } = useRewards();
  const { refreshSummary } = useAppContext();
  const { toast } = useUI();

  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);

  const today = new Date().toLocaleDateString('nl-BE', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  async function handleComplete(task: TodayTask) {
    if (completing || !user) return;
    setCompleting(task.instance.id);
    try {
      let photoUrl: string | undefined;

      if (task.template.photo_required) {
        try {
          photoUrl = await takeAndUploadPhoto(task.instance.id);
        } catch (photoErr) {
          const msg = errorMessage(photoErr);
          if (msg === NO_PHOTO) {
            setCompleting(null);
            return;
          }
          toast(
            '📷 Foto upload mislukt',
            `${msg} — de queeste wordt voltooid zonder bewijs foto.`,
            'error'
          );
        }
      }

      await completeTaskInstance(task.instance.id, task.template.points, user.id, photoUrl);
      await Promise.all([refresh(), refreshSummary()]);
      rescheduleAllNotifications().catch(() => {});
      setCelebration({ taskName: task.template.name, points: task.template.points });
    } catch (e) {
      toast('Fout', errorMessage(e, 'Queeste voltooien mislukt'), 'error');
    } finally {
      setCompleting(null);
    }
  }

  if (loading && tasks.length === 0) return <Spinner />;

  return (
    <>
      <PageHeader eyebrow="🐉 HOF DER DRAKEN" title="Hofqueestes" subtitle={today} />

      {/* Stat chips */}
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="rounded-full border-2 border-success bg-card px-4 py-1 text-sm font-bold text-success">
          ✅ {completedCount} voltooid
        </span>
        <span className="rounded-full border-2 border-primary bg-card px-4 py-1 text-sm font-bold text-primary">
          {pendingCount} bezig
        </span>
      </div>

      {/* Drakenvuur card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-6 rounded-lg border border-secondary bg-card p-4 shadow-glow"
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-bold text-muted">🔥 Drakenvuur</span>
          <span className="text-glow text-2xl font-black text-accent">{currentPoints}</span>
        </div>
        <ProgressBar
          progress={progress}
          label={nextReward ? nextReward.name : 'Max rang bereikt!'}
          sublabel={nextReward ? `${pointsLeft} XP nodig` : ''}
        />
      </motion.div>

      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-error bg-card p-3">
          <p className="text-sm text-error">{error}</p>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="size-3.5" aria-hidden="true" />
            Opnieuw
          </Button>
        </div>
      )}

      {tasks.length > 0 && (
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-extrabold tracking-[0.2em] text-secondary">
            // MISSIES VAN VANDAAG
          </h2>
          <Button variant="ghost" size="sm" onClick={refresh} aria-label="Vernieuwen">
            <RefreshCw className="size-4" aria-hidden="true" />
          </Button>
        </div>
      )}

      {tasks.length === 0 ? (
        <EmptyState
          emoji="🌙"
          title="Geen missies vandaag"
          subtitle="Voeg queestes toe via Taken om XP te verdienen."
        />
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.instance.id}
              task={task}
              onComplete={handleComplete}
              busy={completing === task.instance.id}
            />
          ))}
        </div>
      )}

      <CelebrationOverlay
        open={celebration !== null}
        taskName={celebration?.taskName ?? ''}
        pointsEarned={celebration?.points ?? 0}
        onDismiss={() => setCelebration(null)}
      />
    </>
  );
}
