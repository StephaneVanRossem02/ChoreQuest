import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { MonthlySummary, RichTaskInstance, TaskScheduleWithTemplate } from '@/types';
import { getAllActiveSchedulesWithTemplates } from '@/services/schedules';
import { getRecentMonthlySummaries } from '@/services/summaries';
import { getRichInstancesForDate } from '@/services/instances';
import { useAuthContext } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { Avatar } from '@/components/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { formatMonthHeader, formatTime, getMonthKey, NL_DAYS_CALENDAR } from '@/utils/date';
import { cn } from '@/lib/utils';

/** dayOfMonth -> schedules occurring that day. */
function buildTaskMap(
  schedules: TaskScheduleWithTemplate[],
  year: number,
  month: number
): Map<number, TaskScheduleWithTemplate[]> {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const map = new Map<number, TaskScheduleWithTemplate[]>();

  const add = (day: number, s: TaskScheduleWithTemplate) => {
    const list = map.get(day);
    if (list) list.push(s);
    else map.set(day, [s]);
  };

  for (const s of schedules) {
    if (s.recurrence_type === 'daily') {
      for (let d = 1; d <= daysInMonth; d++) add(d, s);
    } else if (s.recurrence_type === 'weekly') {
      for (let d = 1; d <= daysInMonth; d++) {
        if (new Date(year, month, d).getDay() === s.recurrence_day) add(d, s);
      }
    } else if (s.recurrence_type === 'monthly') {
      const day = s.recurrence_day ?? 1;
      if (day <= daysInMonth) add(day, s);
    } else if (s.recurrence_type === 'once' && s.once_date) {
      const [y, m, d] = s.once_date.split('-').map(Number);
      if (y === year && m - 1 === month) add(d, s);
    }
  }

  return map;
}

/** JS Sunday=0 -> Monday-first index. */
function toMonFirstIndex(jsDow: number): number {
  return (jsDow + 6) % 7;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

const RECURRENCE_STYLE: Record<string, { emoji: string; color: string }> = {
  daily: { emoji: '🌅', color: 'var(--hof-success)' },
  weekly: { emoji: '📅', color: 'var(--hof-secondary)' },
  monthly: { emoji: '🌙', color: 'var(--hof-accent)' },
  once: { emoji: '⭐', color: 'var(--hof-primary)' },
};

export function CalendarPage() {
  const { user } = useAuthContext();
  const today = useMemo(() => new Date(), []);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [schedules, setSchedules] = useState<TaskScheduleWithTemplate[]>([]);
  const [summaries, setSummaries] = useState<MonthlySummary[]>([]);
  const [completed, setCompleted] = useState<RichTaskInstance[]>([]);
  const [loading, setLoading] = useState(true);

  // The native version listed no deps while reading `user`, so the summaries
  // stayed empty for anyone who signed in after first mount.
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, ms] = await Promise.all([
        getAllActiveSchedulesWithTemplates(),
        user ? getRecentMonthlySummaries(user.id, 12) : Promise.resolve([]),
      ]);
      setSchedules(s);
      setSummaries(ms);
    } catch {
      // Non-fatal: the grid still renders, just without schedules.
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const dateStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(selectedDay)}`;
    let cancelled = false;
    getRichInstancesForDate(dateStr)
      .then((rows) => !cancelled && setCompleted(rows))
      .catch(() => !cancelled && setCompleted([]));
    return () => {
      cancelled = true;
    };
  }, [selectedDay, viewMonth, viewYear]);

  const userSchedules = useMemo(
    () => schedules.filter((s) => s.task_templates?.user_id === user?.id),
    [schedules, user]
  );
  const taskMap = useMemo(
    () => buildTaskMap(userSchedules, viewYear, viewMonth),
    [userSchedules, viewYear, viewMonth]
  );

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstOffset = toMonFirstIndex(new Date(viewYear, viewMonth, 1).getDay());
  const totalCells = Math.ceil((firstOffset + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const day = i - firstOffset + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });

  const isToday = (day: number) =>
    day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
    setSelectedDay(1);
  }

  const selectedTasks = taskMap.get(selectedDay) ?? [];

  if (loading && schedules.length === 0) return <Spinner />;

  return (
    <>
      <PageHeader eyebrow="🌙 HOF DER QUEESTES" title="Kalender" tone="secondary" />

      {/* Calendar card */}
      <section className="mb-4 overflow-hidden rounded-lg border-2 border-secondary bg-gradient-to-br from-secondary/10 to-primary/5 shadow-glow">
        <div aria-hidden="true" className="h-[3px] w-full bg-gradient-to-r from-secondary to-primary" />

        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Vorige maand"
            className="grid size-9 place-items-center rounded-full border border-edge bg-card text-ink transition-colors hover:border-primary hover:text-primary"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <h2 className="text-glow-sm text-lg font-black text-ink">
            {formatMonthHeader(viewYear, viewMonth)}
          </h2>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Volgende maand"
            className="grid size-9 place-items-center rounded-full border border-edge bg-card text-ink transition-colors hover:border-primary hover:text-primary"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-7 px-2 pb-1">
          {NL_DAYS_CALENDAR.map((d) => (
            <div key={d} className="text-center text-xs font-extrabold tracking-wide text-muted">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5 px-2 pb-4">
          {cells.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} className="min-h-11" />;

            const count = taskMap.get(day)?.length ?? 0;
            const isSelected = day === selectedDay;
            const todayCell = isToday(day);

            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                aria-label={`${day} ${formatMonthHeader(viewYear, viewMonth)}${count ? `, ${count} queestes` : ''}`}
                aria-pressed={isSelected}
                className={cn(
                  'flex min-h-11 flex-col items-center gap-1 rounded-sm pt-1.5 transition-colors',
                  isSelected && 'bg-primary shadow-glow',
                  !isSelected && todayCell && 'border-2 border-accent',
                  !isSelected && 'hover:bg-card-elevated'
                )}
              >
                <span
                  className={cn(
                    'text-sm font-semibold',
                    isSelected ? 'font-black text-white' : todayCell ? 'font-black text-accent' : 'text-ink'
                  )}
                >
                  {day}
                </span>
                {count > 0 && (
                  <span className="flex gap-0.5" aria-hidden="true">
                    {Array.from({ length: Math.min(count, 3) }).map((_, di) => (
                      <span
                        key={di}
                        className={cn(
                          'size-1.5 rounded-full',
                          isSelected ? 'bg-white/80' : 'bg-accent'
                        )}
                      />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Selected day panel */}
      <section className="mb-4 overflow-hidden rounded-lg border border-edge bg-gradient-to-b from-card-elevated to-card">
        <div aria-hidden="true" className="h-[3px] w-full bg-gradient-to-r from-accent to-primary" />
        <h3 className="text-glow-sm px-4 py-3 font-black text-ink">
          {selectedDay} {formatMonthHeader(viewYear, viewMonth)}
        </h3>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${viewYear}-${viewMonth}-${selectedDay}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {selectedTasks.length === 0 ? (
              <div className="flex flex-col items-center gap-1 py-8 text-center">
                <span aria-hidden="true" className="text-4xl">
                  🌿
                </span>
                <p className="font-bold text-muted">Geen queestes gepland</p>
                <p className="text-xs text-muted">Een rustige dag voor de ridder ✨</p>
              </div>
            ) : (
              <ul className="space-y-2 px-4 pb-4">
                {selectedTasks.map((s) => {
                  const style = RECURRENCE_STYLE[s.recurrence_type] ?? RECURRENCE_STYLE.once;
                  return (
                    <li
                      key={s.id}
                      className="flex items-center gap-3 rounded-md border border-edge bg-bg p-3"
                    >
                      <span aria-hidden="true" className="text-2xl">
                        {s.task_templates.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-ink">{s.task_templates.name}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          🕐 {formatTime(s.time_of_day)} · ⭐ {s.task_templates.points} XP
                          {s.task_templates.photo_required ? ' · 📷' : ''}
                        </p>
                      </div>
                      <span
                        style={{ borderColor: style.color }}
                        className="grid size-8 shrink-0 place-items-center rounded-full border-2 text-sm"
                        title={s.recurrence_type}
                      >
                        <span aria-hidden="true">{style.emoji}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.div>
        </AnimatePresence>
      </section>

      {/* Completed on the selected day */}
      <h2 className="mb-3 text-xs font-extrabold tracking-[0.2em] text-accent">
        // AFGEWERKTE TAKEN
      </h2>
      {completed.length === 0 ? (
        <p className="mb-6 rounded-md border border-edge bg-card p-4 text-center text-sm text-muted">
          Nog niets afgewerkt op deze dag.
        </p>
      ) : (
        <ul className="mb-6 space-y-2">
          {completed.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-md border border-success/30 bg-card p-3"
            >
              <Avatar url={item.userAvatarUrl} name={item.userName} size={34} />
              <span aria-hidden="true" className="text-xl">
                {item.taskIcon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink">{item.taskName}</p>
                <p className="text-xs text-muted">{item.userName}</p>
              </div>
              <span className="shrink-0 rounded-full border border-accent bg-accent/15 px-2 py-0.5 text-xs font-extrabold text-accent">
                +{item.taskPoints} XP
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Month archive */}
      {summaries.length > 0 && (
        <>
          <h2 className="mb-3 text-xs font-extrabold tracking-[0.2em] text-accent">
            // MAANDOVERZICHT
          </h2>
          <ul className="space-y-2">
            {summaries.map((s) => {
              const [y, m] = s.month_key.split('-');
              const isCurrent = s.month_key === getMonthKey();
              return (
                <li key={`${s.month_key}-${s.user_id}`}>
                  <Link
                    to={`/calendar/${s.month_key}`}
                    className={cn(
                      'flex items-center gap-3 rounded-md border bg-card p-4 transition-colors hover:border-primary',
                      isCurrent ? 'border-primary bg-primary/5' : 'border-edge'
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold text-ink">
                        {formatMonthHeader(parseInt(y, 10), parseInt(m, 10) - 1)}
                      </p>
                      {isCurrent && (
                        <p className="mt-0.5 text-xs font-bold text-primary">✨ deze maand</p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-x-3 text-xs font-semibold">
                      <span className="text-success">{s.tasks_completed} voltooid</span>
                      <span className="text-error">{s.tasks_missed} gemist</span>
                      <span className="text-accent">{s.total_points} XP</span>
                    </div>
                    <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
