import { Lock } from 'lucide-react';
import type { Reward } from '@/types';
import { cn } from '@/lib/utils';

export const TIER_COLOR: Record<number, string> = {
  0: 'var(--hof-border)',
  1: 'var(--hof-bronze)',
  2: 'var(--hof-silver)',
  3: 'var(--hof-gold)',
};

type Props = {
  tier: number;
  rewards: Reward[];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

export function TierBadge({ tier, rewards, size = 'md', className }: Props) {
  const reward = rewards.find((r) => r.tier === tier);
  const color = TIER_COLOR[tier] ?? TIER_COLOR[0];

  const sizing =
    size === 'sm' ? 'px-2 py-0.5 text-xs' : size === 'lg' ? 'px-4 py-2 text-xl' : 'px-3 py-1 text-base';

  if (tier === 0) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 self-start rounded-full border-2 border-edge bg-card-elevated text-muted',
          sizing,
          className
        )}
      >
        <Lock className="size-3.5" aria-hidden="true" />
        {size !== 'sm' && <span className="text-xs font-semibold">Nog geen rang</span>}
      </span>
    );
  }

  return (
    <span
      style={{
        borderColor: color,
        backgroundColor: `color-mix(in srgb, ${color} 13%, transparent)`,
      }}
      className={cn(
        'inline-flex items-center gap-1.5 self-start rounded-full border-2',
        sizing,
        className
      )}
    >
      <span aria-hidden="true">{reward?.emoji ?? '⭐'}</span>
      {size !== 'sm' && (
        <span style={{ color }} className="text-sm font-bold">
          {reward?.name ?? `Rang ${tier}`}
        </span>
      )}
    </span>
  );
}
