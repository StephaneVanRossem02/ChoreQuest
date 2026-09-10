import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Coins, Lock, RefreshCw } from 'lucide-react';
import {
  EMPTY_WALLET,
  buyCosmetic,
  equipCosmetic,
  getCatalog,
  getWallet,
  owns,
  type Wallet,
} from '@/services/hoard';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';
import { useUI } from '@/contexts/UIContext';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Spinner, SpinnerDot } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import type { CosmeticItem, CosmeticKind } from '@/types';
import { errorMessage } from '@/lib/utils';

/** Section headings and the order the shop reads in. */
const KINDS: { kind: CosmeticKind; label: string; blurb: string }[] = [
  { kind: 'flame', label: 'Vlamkleuren', blurb: 'De kleur van je drakenvuur.' },
  { kind: 'dragon', label: 'Drakensoorten', blurb: 'Welke draak boven je queestes waakt.' },
  { kind: 'title', label: 'Titels', blurb: 'Staat onder je naam in de ranking.' },
  { kind: 'frame', label: 'Kaartlijsten', blurb: 'De rand rond je queestekaarten.' },
];

/** A colour value renders as a swatch; anything else is shown as-is. */
function Preview({ item }: { item: CosmeticItem }) {
  const isColor = item.value.startsWith('#') || item.value.startsWith('var(');

  if (isColor) {
    return (
      <span
        aria-hidden="true"
        className="block size-8 rounded-full border-2 border-edge"
        style={{ backgroundColor: item.value, boxShadow: `0 0 12px -2px ${item.value}` }}
      />
    );
  }

  return (
    <span aria-hidden="true" className="block text-2xl leading-none">
      {item.value}
    </span>
  );
}

/**
 * De Schatkamer.
 *
 * XP resets on the 1st, which meant a brilliant month left no trace. Coins
 * accumulate forever and buy nothing but looks, so effort accrues somewhere
 * permanent without touching the three real-world reward tiers.
 */
export function HoardPage() {
  const { user } = useAuthContext();
  const { capabilities } = useAppContext();
  const { toast, confirm } = useUI();

  const [catalog, setCatalog] = useState<CosmeticItem[]>([]);
  const [wallet, setWallet] = useState<Wallet>(EMPTY_WALLET);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!capabilities.hoard || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [items, w] = await Promise.all([getCatalog(), getWallet(user.id)]);
      setCatalog(items);
      setWallet(w);
    } catch (e) {
      toast('Fout', errorMessage(e, 'Schatkamer laden mislukt'), 'error');
    } finally {
      setLoading(false);
    }
  }, [capabilities.hoard, user, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleBuy(item: CosmeticItem) {
    if (!user || busy) return;

    const ok = await confirm({
      title: `${item.name} kopen?`,
      message: `Dit kost ${item.price} munten. Je hebt er ${wallet.coins}.`,
      confirmLabel: 'Kopen',
      cancelLabel: 'Nog niet',
    });
    if (!ok) return;

    setBusy(item.id);
    try {
      const balance = await buyCosmetic(item.id);
      setWallet((w) => ({
        coins: balance,
        coinsLifetime: w.coinsLifetime,
        cosmetics: { ...w.cosmetics, owned: [...(w.cosmetics.owned ?? []), item.id] },
      }));
      toast('🪙 Gekocht', `${item.name} is nu van jou.`, 'success');
    } catch (e) {
      toast('Kopen mislukt', errorMessage(e, 'De schatmeester weigerde.'), 'error');
    } finally {
      setBusy(null);
    }
  }

  async function handleEquip(item: CosmeticItem) {
    if (!user || busy) return;
    setBusy(item.id);
    try {
      const next = await equipCosmetic(user.id, item.kind, item.id, wallet.cosmetics);
      setWallet((w) => ({ ...w, cosmetics: next }));
      toast('✨ Uitgerust', `${item.name} is actief.`, 'success');
    } catch (e) {
      toast('Fout', errorMessage(e, 'Uitrusten mislukt'), 'error');
    } finally {
      setBusy(null);
    }
  }

  if (!capabilities.hoard) {
    return (
      <>
        <PageHeader eyebrow="🪙 HOF DER DRAKEN" title="Schatkamer" />
        <EmptyState
          emoji="🔒"
          title="Nog niet geactiveerd"
          subtitle="Draai supabase/migrations/006_hoard.sql in de Supabase SQL editor en herlaad de pagina."
        />
      </>
    );
  }

  if (loading && catalog.length === 0) return <Spinner />;

  return (
    <>
      <PageHeader
        eyebrow="🪙 HOF DER DRAKEN"
        title="Schatkamer"
        subtitle="Munten blijven — ook na de 1e van de maand"
        actions={
          <Button variant="ghost" size="icon" onClick={load} aria-label="Schatkamer vernieuwen">
            <RefreshCw className="size-4" aria-hidden="true" />
          </Button>
        }
      />

      {/* Wallet */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6 flex items-center gap-4 rounded-lg border border-accent bg-card p-4 shadow-glow"
      >
        <Coins className="size-8 shrink-0 text-accent" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold tracking-[0.2em] text-muted">MUNTEN</p>
          <p className="text-glow text-3xl font-black tabular-nums text-accent">{wallet.coins}</p>
        </div>
        <p className="shrink-0 text-right text-xs text-muted">
          ooit verdiend
          <br />
          <strong className="text-sm font-bold tabular-nums text-ink">
            {wallet.coinsLifetime}
          </strong>
        </p>
      </motion.div>

      <p className="mb-6 rounded-md border border-edge bg-card-deep p-3 text-xs text-muted">
        Je verdient 1 munt per 2 XP. Munten kopen alleen uiterlijk — ze hebben geen invloed op je
        rang of op de beloningen van deze maand.
      </p>

      {KINDS.map(({ kind, label, blurb }) => {
        const items = catalog.filter((c) => c.kind === kind);
        if (items.length === 0) return null;
        const equipped = wallet.cosmetics[kind];

        return (
          <section key={kind} className="mb-7">
            <h2 className="text-xs font-extrabold tracking-[0.2em] text-secondary">
              // {label.toUpperCase()}
            </h2>
            <p className="mb-3 mt-1 text-xs text-muted">{blurb}</p>

            <ul className="grid gap-2 sm:grid-cols-2">
              {items.map((item) => {
                const isOwned = owns(wallet.cosmetics, item.id) || item.price === 0;
                const isEquipped = equipped === item.id;
                const affordable = wallet.coins >= item.price;
                const working = busy === item.id;

                return (
                  <li key={item.id}>
                    <div
                      className="flex h-full items-center gap-3 rounded-md border-2 bg-card p-3"
                      style={{
                        borderColor: isEquipped ? 'var(--hof-accent)' : 'var(--hof-border)',
                      }}
                    >
                      <Preview item={item} />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-ink">{item.name}</p>
                        <p className="text-xs text-muted">
                          {item.price === 0 ? 'Standaard' : `🪙 ${item.price}`}
                        </p>
                      </div>

                      {isEquipped ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border-2 border-accent px-2.5 py-1 text-xs font-bold text-accent">
                          <Check className="size-3.5" aria-hidden="true" /> Actief
                        </span>
                      ) : isOwned ? (
                        <button
                          type="button"
                          onClick={() => handleEquip(item)}
                          disabled={busy !== null}
                          className="shrink-0 rounded-full border-2 border-edge-deep px-3 py-1 text-xs font-bold text-ink transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
                        >
                          {working ? <SpinnerDot /> : 'Uitrusten'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleBuy(item)}
                          disabled={busy !== null || !affordable}
                          aria-label={
                            affordable
                              ? `${item.name} kopen voor ${item.price} munten`
                              : `${item.name} kost ${item.price} munten — te weinig`
                          }
                          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-extrabold text-white transition-transform hover:brightness-110 active:scale-95 disabled:opacity-45"
                        >
                          {working ? (
                            <SpinnerDot />
                          ) : affordable ? (
                            'Kopen'
                          ) : (
                            <>
                              <Lock className="size-3" aria-hidden="true" /> {item.price}
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </>
  );
}
