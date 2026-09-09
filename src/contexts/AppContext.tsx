import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { MonthlySummary, Reward } from '@/types';
import { getMonthlySummary, updateMonthlySummary } from '@/services/summaries';
import { getRewards } from '@/services/rewards';
import { getMonthKey } from '@/utils/date';
import { useAuthContext } from './AuthContext';

type AppContextValue = {
  currentSummary: MonthlySummary | null;
  rewards: Reward[];
  loadingApp: boolean;
  refreshSummary: () => Promise<void>;
  refreshRewards: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthContext();
  const [currentSummary, setCurrentSummary] = useState<MonthlySummary | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loadingApp, setLoadingApp] = useState(true);

  const refreshRewards = useCallback(async () => {
    try {
      setRewards(await getRewards());
    } catch (err) {
      console.error('Failed to refresh rewards', err);
    }
  }, []);

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
  }, [user]);

  useEffect(() => {
    if (!user) {
      setCurrentSummary(null);
      setRewards([]);
      setLoadingApp(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoadingApp(true);
      try {
        const [rewardList] = await Promise.all([getRewards(), refreshSummary()]);
        if (!cancelled) setRewards(rewardList);
      } catch (err) {
        console.error('AppContext init error', err);
      } finally {
        if (!cancelled) setLoadingApp(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, refreshSummary]);

  const value = useMemo(
    () => ({ currentSummary, rewards, loadingApp, refreshSummary, refreshRewards }),
    [currentSummary, rewards, loadingApp, refreshSummary, refreshRewards]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside AppProvider');
  return ctx;
}
