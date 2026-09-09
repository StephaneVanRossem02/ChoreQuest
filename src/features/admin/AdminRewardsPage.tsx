import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Pencil } from 'lucide-react';
import type { Reward } from '@/types';
import { getRewards, updateReward } from '@/services/rewards';
import { useAppContext } from '@/contexts/AppContext';
import { useUI } from '@/contexts/UIContext';
import { TIER_COLOR } from '@/components/TierBadge';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Spinner, SpinnerDot } from '@/components/ui/Spinner';
import { cn, errorMessage } from '@/lib/utils';

const EMOJI_OPTIONS = [
  '🎀', '🌹', '🐉', '👑', '💎', '🏆', '🌟', '✨', '🔮', '💜', '🌙', '🌸', '🦋', '🎖️', '🏅',
];

export function AdminRewardsPage() {
  const { refreshRewards } = useAppContext();
  const { toast } = useUI();

  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Reward | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPoints, setEditPoints] = useState('');
  const [editEmoji, setEditEmoji] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setRewards(await getRewards());
    } catch (e) {
      toast('Fout', errorMessage(e, 'Laden mislukt'), 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  function openEdit(r: Reward) {
    setEditing(r);
    setEditName(r.name);
    setEditDesc(r.description);
    setEditPoints(String(r.points_required));
    setEditEmoji(r.emoji);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;

    const pts = parseInt(editPoints, 10);
    if (!editName.trim() || Number.isNaN(pts) || pts < 1) {
      toast('Fout', 'Vul een geldige naam en XP-drempel in.', 'error');
      return;
    }

    setSaving(true);
    try {
      await updateReward(editing.id, {
        name: editName.trim(),
        description: editDesc.trim(),
        points_required: pts,
        emoji: editEmoji,
      });
      await Promise.all([load(), refreshRewards()]);
      setEditing(null);
    } catch (err) {
      toast('Fout', errorMessage(err, 'Opslaan mislukt'), 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <>
      <Link
        to="/admin"
        className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-primary transition-colors hover:text-primary-light"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Hofleden
      </Link>

      <p className="text-xs font-extrabold tracking-[0.25em] text-primary">🏆 BEHEER PANEEL</p>
      <h1 className="text-glow mb-2 text-2xl font-black text-ink sm:text-3xl">
        Beloningen &amp; Rangen
      </h1>
      <p className="mb-6 text-sm leading-relaxed text-muted">
        Tik op een rang om de naam, beschrijving, XP-drempel en emoji aan te passen.
      </p>

      <ul className="space-y-3">
        {rewards.map((r, i) => {
          const color = TIER_COLOR[r.tier] ?? 'var(--hof-primary)';
          return (
            <motion.li
              key={r.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: i * 0.07 }}
            >
              <button
                type="button"
                onClick={() => openEdit(r)}
                style={{ borderColor: color, boxShadow: `0 0 14px -6px ${color}` }}
                className="w-full overflow-hidden rounded-md border-2 bg-card text-left transition-transform hover:scale-[1.01]"
              >
                <span aria-hidden="true" style={{ backgroundColor: color }} className="block h-0.5 w-full" />
                <span className="flex items-center gap-4 p-4">
                  <span aria-hidden="true" className="text-4xl">
                    {r.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span style={{ color }} className="block font-extrabold">
                      {r.name}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-sm text-muted">
                      {r.description}
                    </span>
                    <span style={{ color }} className="mt-0.5 block text-sm font-bold">
                      {r.points_required} XP vereist
                    </span>
                  </span>
                  <Pencil className="size-5 shrink-0 text-muted" aria-hidden="true" />
                </span>
              </button>
            </motion.li>
          );
        })}
      </ul>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title="✏️ Rang bewerken">
        <form onSubmit={handleSave} className="space-y-4 p-5 pb-10">
          <fieldset>
            <legend className="mb-2 text-sm font-extrabold tracking-wide text-primary-light">
              Emoji
            </legend>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  aria-label={`Emoji ${e}`}
                  aria-pressed={editEmoji === e}
                  onClick={() => setEditEmoji(e)}
                  className={cn(
                    'grid size-12 place-items-center rounded-sm border-2 text-xl transition-colors',
                    editEmoji === e
                      ? 'border-accent bg-accent/15'
                      : 'border-edge bg-card-elevated hover:border-edge-deep'
                  )}
                >
                  <span aria-hidden="true">{e}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <Input
            label="Naam"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="bv. Drakenkoningin"
            required
          />

          <Textarea
            label="Beschrijving"
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            placeholder="Korte beschrijving..."
            rows={3}
          />

          <Input
            label="XP drempel (punten nodig)"
            type="number"
            inputMode="numeric"
            min={1}
            value={editPoints}
            onChange={(e) => setEditPoints(e.target.value)}
            placeholder="bv. 50"
            required
          />

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" block onClick={() => setEditing(null)}>
              Annuleer
            </Button>
            <Button type="submit" block disabled={saving} className="flex-[2]">
              {saving ? <SpinnerDot /> : '💾 Opslaan'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
