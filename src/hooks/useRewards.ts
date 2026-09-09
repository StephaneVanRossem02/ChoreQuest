import { useAppContext } from '@/contexts/AppContext';
import { getNextReward, pointsToNextTier, progressToNextTier } from '@/services/rewards';

export function useRewards() {
  const { rewards, currentSummary } = useAppContext();
  const currentPoints = currentSummary?.total_points ?? 0;
  const currentTier = currentSummary?.reward_tier ?? 0;

  return {
    rewards,
    currentPoints,
    currentTier,
    nextReward: getNextReward(rewards, currentPoints),
    pointsLeft: pointsToNextTier(rewards, currentPoints),
    progress: progressToNextTier(rewards, currentPoints),
  };
}
