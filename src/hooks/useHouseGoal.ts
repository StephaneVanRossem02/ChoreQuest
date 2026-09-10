import { useCallback, useEffect, useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import {
  CALM_BEAST,
  getHouseGoal,
  getHouseThreat,
  type HouseGoal,
  type HouseThreat,
} from '@/services/progression';

/**
 * The shared monthly target. Derived from the top reward tier rather than
 * configured anywhere: if Gold is what one member is expected to reach in a
 * month, the household target is that, per member. It stays right when an
 * admin retunes the tiers and when someone new joins the court.
 */
export function useHouseGoal() {
  const { rewards } = useAppContext();
  const [goal, setGoal] = useState<HouseGoal | null>(null);
  const [threat, setThreat] = useState<HouseThreat>(CALM_BEAST);
  const [loading, setLoading] = useState(true);

  const topTier = rewards.reduce((max, r) => Math.max(max, r.points_required), 0);

  const refresh = useCallback(async () => {
    if (topTier <= 0) {
      setLoading(false);
      return;
    }
    try {
      const next = await getHouseGoal(topTier);
      setGoal(next);

      // The beast needs the goal's own numbers, so it runs second rather than
      // in parallel. A failure here leaves the goal intact and the beast calm.
      try {
        setThreat(await getHouseThreat(next.memberCount, next.target));
      } catch (err) {
        console.error('Beest-status laden mislukt', err);
        setThreat(CALM_BEAST);
      }
    } catch (err) {
      console.error('Hofdoel laden mislukt', err);
      setGoal(null);
    } finally {
      setLoading(false);
    }
  }, [topTier]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { goal, threat, loading, refresh };
}
