import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { Profile, TaskTemplate, TodayTask } from '@/types';
import { supabase } from '@/lib/supabase';
import { getProfileById } from '@/services/profiles';
import { getTodayTasks } from '@/services/instances';
import { getTaskTemplatesForUser } from '@/services/tasks';
import { formatMonthKey, getPastMonthKeys } from '@/utils/date';
import { useUI } from '@/contexts/UIContext';
import { Avatar } from '@/components/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { errorMessage } from '@/lib/utils';

type Summary = {
  month_key: string;
  total_points: number;
  tasks_completed: number;
  tasks_missed: number;
  reward_tier: number;
};

const TIER_LABELS: Record<number, string> = {
  0: '—',
  1: '🥉 Hofdame',
  2: '🥈 Ridder',
  3: '🥇 Drakenkoningin',
};

export function AdminUserDetailPage() {
  const { userId = '' } = useParams<{ userId: string }>();
  const { toast } = useUI();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [todayTasks, setTodayTasks] = useState<TodayTask[]>([]);
  const [assigned, setAssigned] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const monthKeys = getPastMonthKeys(6);
      const [p, { data, error }, tasks, templates] = await Promise.all([
        getProfileById(userId),
        supabase
          .from('monthly_summaries')
          .select('*')
          .in('month_key', monthKeys)
          .eq('user_id', userId)
          .order('month_key', { ascending: false }),
        getTodayTasks(userId),
        getTaskTemplatesForUser(userId),
      ]);
      if (error) throw error;
      setProfile(p);
      setSummaries(data ?? []);
      setTodayTasks(tasks);
      setAssigned(templates);
    } catch (e) {
      toast('Fout', errorMessage(e, 'Laden mislukt'), 'error');
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Spinner />;

  const label = profile?.display_name ?? profile?.email ?? userId;

  return (
    <>
      <Link
        to="/admin"
        className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-primary transition-colors hover:text-primary-light"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Hofleden
      </Link>

      <p className="text-xs font-extrabold tracking-[0.25em] text-primary">👤 HOFLID</p>
      <header className="mb-6 mt-1 flex items-center gap-4">
        <Avatar url={profile?.avatar_url} name={label} size={56} />
        <div className="min-w-0">
          <h1 className="text-glow truncate text-xl font-black text-ink sm:text-2xl">{label}</h1>
          {profile?.display_name && (
            <p className="mt-0.5 truncate text-xs text-muted">{profile.email}</p>
          )}
        </div>
      </header>

      {/* Today */}
      <h2 className="mb-3 text-xs font-extrabold tracking-[0.2em] text-secondary">
        // TODO VANDAAG
      </h2>
      {todayTasks.length === 0 ? (
        <p className="mb-6 rounded-md border border-edge bg-card p-4 text-center text-sm text-muted">
          Geen taken vandaag.
        </p>
      ) : (
        <ul className="mb-6 space-y-2">
          {todayTasks.map((t) => {
            const tone =
              t.status === 'completed'
                ? 'text-success'
                : t.status === 'missed'
                  ? 'text-error'
                  : 'text-accent';
            const statusLabel =
              t.status === 'completed' ? 'Voltooid' : t.status === 'missed' ? 'Gemist' : 'Open';
            return (
              <li
                key={t.instance.id}
                className="flex items-center gap-3 rounded-md border border-edge bg-card p-4"
              >
                <span aria-hidden="true" className="text-2xl">
                  {t.template.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-ink">{t.template.name}</p>
                  <p className={`mt-0.5 text-xs font-semibold ${tone}`}>
                    {statusLabel} · {t.template.points} XP
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Assigned */}
      <h2 className="mb-3 text-xs font-extrabold tracking-[0.2em] text-secondary">
        // TOEGEWEZEN TAKEN
      </h2>
      {assigned.length === 0 ? (
        <p className="mb-6 rounded-md border border-edge bg-card p-4 text-center text-sm text-muted">
          Geen taken toegewezen.
        </p>
      ) : (
        <ul className="mb-6 space-y-2">
          {assigned.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-3 rounded-md border border-edge bg-card p-4"
            >
              <span aria-hidden="true" className="text-2xl">
                {t.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-ink">{t.name}</p>
                <p className="mt-0.5 text-xs font-semibold text-muted">{t.points} XP</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Six-month history */}
      <h2 className="mb-3 text-xs font-extrabold tracking-[0.2em] text-secondary">
        // MAAND OVERZICHT (6 maanden)
      </h2>
      {summaries.length === 0 ? (
        <p className="rounded-md border border-edge bg-card p-4 text-center text-sm text-muted">
          Geen activiteit gevonden.
        </p>
      ) : (
        <ul className="space-y-3">
          {summaries.map((s) => (
            <li
              key={s.month_key}
              className="overflow-hidden rounded-md border border-edge bg-card"
            >
              <div className="flex items-center justify-between gap-3 border-b border-edge bg-card-elevated p-4">
                <p className="font-extrabold text-ink">{formatMonthKey(s.month_key)}</p>
                <p className="text-sm font-bold text-accent">{TIER_LABELS[s.reward_tier] ?? '—'}</p>
              </div>
              <dl className="grid grid-cols-3 p-4">
                <div className="flex flex-col items-center gap-1">
                  <dd className="text-2xl font-black text-accent">{s.total_points}</dd>
                  <dt className="text-xs font-semibold text-muted">🔥 XP</dt>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <dd className="text-2xl font-black text-success">{s.tasks_completed}</dd>
                  <dt className="text-xs font-semibold text-muted">✅ Voltooid</dt>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <dd className="text-2xl font-black text-error">{s.tasks_missed}</dd>
                  <dt className="text-xs font-semibold text-muted">💀 Gemist</dt>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
