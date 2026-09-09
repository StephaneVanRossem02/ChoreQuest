import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import type { RichTaskInstance } from '@/types';
import { getRichInstancesForMonth } from '@/services/instances';
import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { formatMonthHeader } from '@/utils/date';

const NL_DAYS: Record<number, string> = {
  0: 'zo',
  1: 'ma',
  2: 'di',
  3: 'wo',
  4: 'do',
  5: 'vr',
  6: 'za',
};

function formatDueDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return `${NL_DAYS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}

export function MonthDetailPage() {
  const { monthKey = '' } = useParams<{ monthKey: string }>();
  const [instances, setInstances] = useState<RichTaskInstance[]>([]);
  const [loading, setLoading] = useState(true);

  const [year, month] = monthKey.split('-');
  const monthLabel = formatMonthHeader(parseInt(year, 10), parseInt(month, 10) - 1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getRichInstancesForMonth(monthKey)
      .then((rows) => !cancelled && setInstances(rows))
      .catch(() => !cancelled && setInstances([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [monthKey]);

  const completed = instances.filter((i) => Boolean(i.completed_at));
  const missed = instances.filter((i) => !i.completed_at);
  const totalXP = completed.reduce((sum, i) => sum + (i.points_earned ?? 0), 0);

  if (loading) return <Spinner />;

  return (
    <>
      <Link
        to="/calendar"
        className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-primary transition-colors hover:text-primary-light"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Kalender
      </Link>

      <header className="mb-4">
        <p className="text-xs font-extrabold tracking-[0.25em] text-secondary">🌙 MAAND ARCHIEF</p>
        <h1 className="text-glow text-2xl font-black text-ink sm:text-3xl">{monthLabel}</h1>
      </header>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6 overflow-hidden rounded-md border border-edge bg-gradient-to-br from-secondary/10 to-primary/5"
      >
        <div aria-hidden="true" className="h-[3px] w-full bg-gradient-to-r from-accent to-primary" />
        <dl className="grid grid-cols-3 divide-x divide-edge p-4">
          <div className="flex flex-col items-center gap-1">
            <dd className="text-xl font-black text-accent">{totalXP}</dd>
            <dt className="text-xs font-semibold text-muted">XP verdiend</dt>
          </div>
          <div className="flex flex-col items-center gap-1">
            <dd className="text-xl font-black text-success">{completed.length}</dd>
            <dt className="text-xs font-semibold text-muted">Voltooid</dt>
          </div>
          <div className="flex flex-col items-center gap-1">
            <dd className="text-xl font-black text-error">{missed.length}</dd>
            <dt className="text-xs font-semibold text-muted">Gemist</dt>
          </div>
        </dl>
      </motion.section>

      {instances.length === 0 ? (
        <EmptyState
          emoji="📜"
          title="Geen queestes gelogd"
          subtitle="Voltooide taken verschijnen hier in het archief."
        />
      ) : (
        <>
          <h2 className="mb-3 text-xs font-extrabold tracking-[0.2em] text-accent">// QUEESTE LOG</h2>
          <ul className="space-y-2">
            {instances.map((item, i) => {
              const done = Boolean(item.completed_at);
              return (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, delay: Math.min(i, 12) * 0.03 }}
                  className={`flex items-center gap-2 rounded-sm border bg-card p-3 ${
                    done ? 'border-success/30' : 'border-error/25'
                  }`}
                >
                  <span aria-hidden="true" className="text-lg">
                    {done ? '✅' : '💀'}
                  </span>
                  <span aria-hidden="true" className="text-xl">
                    {item.taskIcon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{item.taskName}</p>
                    <p className="text-xs text-muted">{formatDueDate(item.due_date)}</p>
                  </div>
                  <Avatar url={item.userAvatarUrl} name={item.userName} size={28} />
                  <span className="hidden max-w-20 truncate text-xs font-bold text-muted sm:inline">
                    {item.userName}
                  </span>
                  {done && item.points_earned != null && (
                    <span className="shrink-0 rounded-full border border-accent bg-accent/15 px-2 py-0.5 text-[0.65rem] font-extrabold text-accent">
                      +{item.points_earned} XP
                    </span>
                  )}
                </motion.li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
