import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { CosmeticsBag, MonthlySummary, Reward } from '@/types';
import { getMonthlySummary, updateMonthlySummary } from '@/services/summaries';
import { getRewards } from '@/services/rewards';
import { EMPTY_LIFETIME, getLifetimeStats, type LifetimeStats } from '@/services/progression';
import { NO_CAPABILITIES, probeCapabilities, type Capabilities } from '@/lib/capabilities';
import { getCatalog, getWallet } from '@/services/hoard';
import { getMonthKey } from '@/utils/date';
import { useAuthContext } from '@/contexts/AuthContext';

type AppContextValue = {
  currentSummary: MonthlySummary | null;
  rewards: Reward[];
  /** Track 2 — cumulative XP across every month, never reset. */
  lifetime: LifetimeStats;
  /** Which optional migrations this database actually has. */
  capabilities: Capabilities;
  /** What this member has equipped. Empty unless the hoard migration is in. */
  cosmetics: CosmeticsBag;
  /**
   * Resolves a cosmetic id to its catalogue value — a hex colour for flames
   * and frames, an emoji for dragons, a string for titles. Returns undefined
   * for anything unowned, unequipped, or not in the catalogue.
   */
  cosmeticValue: (id: string | undefined) => string | undefined;
  loadingApp: boolean;
  refreshSummary: () => Promise<void>;
  refreshRewards: () => Promise<void>;
  refreshWallet: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthContext();
  const [currentSummary, setCurrentSummary] = useState<MonthlySummary | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [lifetime, setLifetime] = useState<LifetimeStats>(EMPTY_LIFETIME);
  const [capabilities, setCapabilities] = useState<Capabilities>(NO_CAPABILITIES);
  const [cosmetics, setCosmetics] = useState<CosmeticsBag>({});
  const [catalogValues, setCatalogValues] = useState<Record<string, string>>({});
  const [loadingApp, setLoadingApp] = useState(true);

  const refreshRewards = useCallback(async () => {
    try {
      setRewards(await getRewards());
    } catch (err) {
      console.error('Failed to refresh rewards', err);
    }
  }, []);

  const refreshWallet = useCallback(async () => {
    if (!user) return;
    try {
      const [wallet, catalog] = await Promise.all([getWallet(user.id), getCatalog()]);
      setCosmetics(wallet.cosmetics);
      setCatalogValues(Object.fromEntries(catalog.map((c) => [c.id, c.value])));
    } catch (err) {
      // The hoard is optional dressing; if it fails the app is still fine.
      console.error('Cosmetica laden mislukt', err);
    }
  }, [user]);

  const cosmeticValue = useCallback(
    (id: string | undefined) => (id ? catalogValues[id] : undefined),
    [catalogValues]
  );

  const refreshSummary = useCallback(async () => {
    if (!user) return;
    const monthKey = getMonthKey();
    try {
      let summary = await getMonthlySummary(monthKey, user.id);
      if (!summary) {
        summary = await updateMonthlySummary(monthKey, user.id);
      }
      setCurrentSummary(summary);
    } catch (err) {
      console.error('Failed to refresh summary', err);
    }

    // Lifetime XP is a sum over every summary row, so it moves whenever the
    // current month does. Failing here must not block the month view.
    try {
      setLifetime(await getLifetimeStats(user.id));
    } catch (err) {
      console.error('Failed to refresh lifetime stats', err);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setCurrentSummary(null);
      setRewards([]);
      setLifetime(EMPTY_LIFETIME);
      setCosmetics({});
      setCatalogValues({});
      setLoadingApp(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoadingApp(true);
      try {
        const [rewardList, caps] = await Promise.all([
          getRewards(),
          probeCapabilities(),
          refreshSummary(),
        ]);
        if (!cancelled) {
          setRewards(rewardList);
          setCapabilities(caps);
        }
        // Only after the probe: reading cosmetics before the migration is in
        // would just log a column error on every sign-in.
        if (!cancelled && caps.hoard) await refreshWallet();
      } catch (err) {
        console.error('AppContext init error', err);
      } finally {
        if (!cancelled) setLoadingApp(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, refreshSummary, refreshWallet]);

  const value = useMemo(
    () => ({
      currentSummary,
      rewards,
      lifetime,
      capabilities,
      cosmetics,
      cosmeticValue,
      loadingApp,
      refreshSummary,
      refreshRewards,
      refreshWallet,
    }),
    [
      currentSummary,
      rewards,
      lifetime,
      capabilities,
      cosmetics,
      cosmeticValue,
      loadingApp,
      refreshSummary,
      refreshRewards,
      refreshWallet,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside AppProvider');
  return ctx;
}
