import { useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { TaskTemplate } from '@/types';
import { useTasks } from '@/hooks/useTasks';
import { useAuthContext } from '@/contexts/AuthContext';
import { useUI } from '@/contexts/UIContext';
import { deleteTaskTemplate, updateTaskTemplate } from '@/services/tasks';
import { rescheduleAllNotifications } from '@/services/notifications';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { Switch } from '@/components/ui/Switch';
import { Button } from '@/components/ui/Button';
import { cn, errorMessage } from '@/lib/utils';

export function TasksPage() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuthContext();
  const { toast, confirm } = useUI();
  // Admins manage every quest; everyone else sees only their own.
  const { templates, loading, refresh } = useTasks(true, isAdmin ? undefined : user?.id);

  const handleDelete = useCallback(
    async (template: TaskTemplate) => {
      const ok = await confirm({
        title: 'Queeste archiveren',
        message: `"${template.name}" verwijderen uit de lijst? Je geschiedenis blijft bewaard.`,
        confirmLabel: 'Verwijderen',
        destructive: true,
      });
      if (!ok) return;

      try {
        await deleteTaskTemplate(template.id);
        rescheduleAllNotifications().catch(() => {});
        await refresh();
        toast('Gearchiveerd', `"${template.name}" is verwijderd.`, 'success');
      } catch (e) {
        toast('Fout', errorMessage(e, 'Verwijderen mislukt'), 'error');
      }
    },
    [confirm, refresh, toast]
  );

  const handleToggle = useCallback(
    async (template: TaskTemplate, value: boolean) => {
      try {
        await updateTaskTemplate(template.id, { is_active: value });
        rescheduleAllNotifications().catch(() => {});
        await refresh();
      } catch (e) {
        toast('Fout', errorMessage(e, 'Bijwerken mislukt'), 'error');
      }
    },
    [refresh, toast]
  );

  if (loading && templates.length === 0) return <Spinner />;

  return (
    <>
      <PageHeader eyebrow="🐉 QUEESTE BEHEER" title="Taken" />

      <Button
        size="lg"
        block
        className="mb-6"
        onClick={() => navigate('/tasks/new')}
      >
        <Plus className="size-5" aria-hidden="true" />
        Nieuwe queeste toevoegen
      </Button>

      {templates.length === 0 ? (
        <EmptyState
          emoji="🐉"
          title="Geen queestes"
          subtitle='Tik op "Nieuwe queeste" om te beginnen!'
        />
      ) : (
        <>
          <h2 className="mb-3 text-xs font-extrabold tracking-[0.2em] text-secondary">
            // MISSIE LIJST
          </h2>
          <ul className="space-y-3">
            {templates.map((template, i) => (
              <motion.li
                key={template.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i, 10) * 0.04 }}
                className="flex items-center gap-3 rounded-md border border-edge bg-card p-4"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'size-1.5 shrink-0 rounded-full',
                    template.is_active ? 'bg-success' : 'bg-edge'
                  )}
                />
                <span aria-hidden="true" className="text-2xl">
                  {template.icon}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-ink">{template.name}</p>
                  <p className="mt-0.5 text-xs font-semibold text-accent">
                    ⭐ {template.points} XP{template.photo_required ? ' · 📷' : ''}
                  </p>
                </div>

                <Switch
                  checked={template.is_active}
                  onChange={(v) => handleToggle(template, v)}
                  label={`${template.name} ${template.is_active ? 'uitschakelen' : 'inschakelen'}`}
                />

                <Link
                  to={`/tasks/${template.id}`}
                  aria-label={`${template.name} bewerken`}
                  className="grid size-9 shrink-0 place-items-center rounded-sm border-2 border-primary text-primary transition-colors hover:bg-primary hover:text-white"
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </Link>

                <button
                  type="button"
                  onClick={() => handleDelete(template)}
                  aria-label={`${template.name} archiveren`}
                  className="grid size-9 shrink-0 place-items-center rounded-sm text-muted transition-colors hover:text-error"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </motion.li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
