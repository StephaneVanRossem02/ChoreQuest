import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BOUNTY_TAKEN, claimBounty, getOpenBounties } from '@/services/bounties';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';
import { useUI } from '@/contexts/UIContext';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Spinner, SpinnerDot } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import type { Bounty } from '@/types';
import { formatTime } from '@/utils/date';
import { errorMessage } from '@/lib/utils';

/**
 * Het Prijzenbord.
 *
 * Every quest in the app used to be pre-assigned, which meant the parent who
 * set it up assigned everything to themselves while the children only ever saw
 * their own three chores. The board makes the household's workload visible as
 * a shared pile, and the escalating late bonus turns the job nobody wants into
 * a dare rather than an argument.
 */
export function BountyBoardPage() {
  const { user } = useAuthContext();
  const { capabilities } = useAppContext();
  const { toast } = useUI();
  const navigate = useNavigate();

  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!capabilities.bounties) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setBounties(await getOpenBounties());
    } catch (e) {
      toast('Fout', errorMessage(e, 'Prijzenbord laden mislukt'), 'error');
    } finally {
      setLoading(false);
    }
  }, [capabilities.bounties, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleClaim(bounty: Bounty) {
    if (!user || claiming) return;
    setClaiming(bounty.instance.id);
    try {
      await claimBounty(bounty.instance.id, user.id);
      toast(
        '🗡️ Queeste opgenomen',
        `${bounty.template.name} staat nu bij jouw missies van vandaag.`,
        'success'
      );
      navigate('/today');
    } catch (e) {
      if (errorMessage(e) === BOUNTY_TAKEN) {
        toast('Te laat', 'Een ander hoflid was je voor.', 'error');
        load();
      } else {
        toast('Fout', errorMessage(e, 'Queeste opnemen mislukt'), 'error');
      }
    } finally {
      setClaiming(null);
    }
  }

  if (!capabilities.bounties) {
    return (
      <>
        <PageHeader eyebrow="📜 HOF DER DRAKEN" title="Prijzenbord" />
        <EmptyState
          emoji="🔒"
          title="Nog niet geactiveerd"
          subtitle="Draai supabase/migrations/005_bounties.sql in de Supabase SQL editor en herlaad de pagina."
        />
      </>
    );
  }

  if (loading && bounties.length === 0) return <Spinner />;

  return (
    <>
      <PageHeader
        eyebrow="📜 HOF DER DRAKEN"
        title="Prijzenbord"
        subtitle="Vrije queestes — wie het eerst komt"
        actions={
          <Button variant="ghost" size="icon" onClick={load} aria-label="Prijzenbord vernieuwen">
            <RefreshCw className="size-4" aria-hidden="true" />
          </Button>
        }
      />

      {bounties.length === 0 ? (
        <EmptyState
          emoji="🎉"
          title="Het bord is leeg"
          subtitle="Alle vrije queestes van vandaag zijn opgenomen."
        />
      ) : (
        <ul className="space-y-3">
          {bounties.map((bounty, i) => {
            const total = bounty.template.points + bounty.bonus;
            const hot = bounty.bonus > 0;
            const accent = hot ? 'var(--hof-error)' : 'var(--hof-secondary)';

            return (
              <motion.li
                key={bounty.instance.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: Math.min(i * 0.05, 0.3) }}
                style={{ borderColor: accent, boxShadow: `0 0 14px -6px ${accent}` }}
                className="overflow-hidden rounded-md border bg-card"
              >
                <div
                  aria-hidden="true"
                  style={{ backgroundColor: accent }}
                  className={`h-0.5 w-full ${hot ? 'molten' : 'opacity-70'}`}
                />

                <div className="flex items-center gap-3 p-4">
                  <div
                    style={{ borderColor: `color-mix(in srgb, ${accent} 40%, transparent)` }}
                    className="grid size-12 shrink-0 place-items-center rounded-sm border bg-card-elevated text-2xl"
                  >
                    <span aria-hidden="true">{bounty.template.icon}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-bold text-ink">{bounty.template.name}</h3>
                    {bounty.template.description && (
                      <p className="truncate text-sm text-muted">{bounty.template.description}</p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-xs font-bold text-accent">
                        ⭐ {total} XP
                        {bounty.bonus > 0 && (
                          <span className="ml-1 text-error">
                            ({bounty.template.points} + {bounty.bonus} bonus)
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-muted">
                        gepland {formatTime(bounty.schedule.time_of_day)}
                      </span>
                      {bounty.template.photo_required && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-secondary-light">
                          <Camera className="size-3" aria-hidden="true" /> Bewijs vereist
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleClaim(bounty)}
                    disabled={claiming !== null}
                    className="shrink-0 rounded-full bg-secondary px-4 py-2 text-sm font-extrabold text-white shadow-glow transition-transform hover:brightness-110 active:scale-95 disabled:opacity-60"
                  >
                    {claiming === bounty.instance.id ? <SpinnerDot /> : '🗡️ Neem aan'}
                  </button>
                </div>

                {bounty.bonus > 0 && (
                  <p
                    style={{
                      backgroundColor: `color-mix(in srgb, ${accent} 13%, transparent)`,
                      color: accent,
                    }}
                    className="px-4 py-1 text-center text-xs font-extrabold tracking-wide"
                  >
                    🔥 Niemand heeft dit opgenomen — de beloning stijgt
                  </p>
                )}
              </motion.li>
            );
          })}
        </ul>
      )}
    </>
  );
}
