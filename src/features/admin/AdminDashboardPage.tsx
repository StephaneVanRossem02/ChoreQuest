import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, RefreshCw } from 'lucide-react';
import type { Profile } from '@/types';
import { getAllProfiles, updateProfileRole } from '@/services/profiles';
import { supabase } from '@/lib/supabase';
import { getMonthKey } from '@/utils/date';
import { useUI } from '@/contexts/UIContext';
import { PageHeader } from '@/components/PageHeader';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { cn, errorMessage } from '@/lib/utils';

type UserRow = Profile & { points: number; completed: number };

export function AdminDashboardPage() {
  const { toast, confirm } = useUI();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const profiles = await getAllProfiles();
      const { data: summaries } = await supabase
        .from('monthly_summaries')
        .select('*')
        .eq('month_key', getMonthKey());

      const summaryMap = new Map((summaries ?? []).map((s) => [s.user_id, s]));

      setUsers(
        profiles.map((p) => {
          const s = summaryMap.get(p.id);
          return { ...p, points: s?.total_points ?? 0, completed: s?.tasks_completed ?? 0 };
        })
      );
    } catch (e) {
      toast('Fout', errorMessage(e, 'Laden mislukt'), 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRoleToggle(user: UserRow) {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    const ok = await confirm({
      title: 'Rol wijzigen',
      message: `${user.email} → ${newRole === 'admin' ? 'Admin' : 'Gebruiker'}?`,
      confirmLabel: 'Wijzigen',
    });
    if (!ok) return;

    try {
      await updateProfileRole(user.id, newRole);
      await load();
    } catch (e) {
      toast('Fout', errorMessage(e, 'Rol wijzigen mislukt'), 'error');
    }
  }

  if (loading && users.length === 0) return <Spinner />;

  return (
    <>
      <PageHeader
        eyebrow="👑 BEHEER PANEEL"
        title="Hofleden"
        actions={
          <Button variant="ghost" size="icon" onClick={load} aria-label="Vernieuwen">
            <RefreshCw className="size-4" aria-hidden="true" />
          </Button>
        }
      />

      <Link
        to="/admin/rewards"
        className="mb-6 block rounded-md border-2 border-secondary bg-card p-4 text-center font-extrabold text-accent transition-colors hover:bg-card-elevated"
      >
        Beloningen &amp; Rangen bewerken
      </Link>

      <h2 className="mb-3 text-xs font-extrabold tracking-[0.2em] text-secondary">
        // ALLE GEBRUIKERS
      </h2>

      <ul className="space-y-3">
        {users.map((user, i) => (
          <motion.li
            key={user.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: Math.min(i, 10) * 0.04 }}
            className="flex items-center gap-3 rounded-md border border-edge bg-card p-4"
          >
            <Avatar url={user.avatar_url} name={user.display_name ?? user.email} size={44} />

            <Link to={`/admin/users/${user.id}`} className="min-w-0 flex-1 group">
              <p className="truncate font-bold text-ink group-hover:text-primary">
                {user.display_name ?? user.email ?? user.id}
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {user.points} XP · {user.completed} voltooid
              </p>
            </Link>

            <button
              type="button"
              onClick={() => handleRoleToggle(user)}
              className={cn(
                'shrink-0 rounded-full border-2 px-3 py-1 text-xs font-bold transition-colors',
                user.role === 'admin'
                  ? 'border-accent bg-accent/15 text-accent'
                  : 'border-edge bg-card-elevated text-muted hover:border-edge-deep'
              )}
            >
              {user.role === 'admin' ? '👑 Admin' : '🐉 User'}
            </button>

            <Link
              to={`/admin/users/${user.id}`}
              aria-label={`Details van ${user.display_name ?? user.email}`}
              className="shrink-0 text-muted transition-colors hover:text-primary"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </Link>
          </motion.li>
        ))}
      </ul>
    </>
  );
}
