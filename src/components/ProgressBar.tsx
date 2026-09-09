import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type Props = {
  /** 0–1 */
  progress: number;
  label?: string;
  sublabel?: string;
  /** Any CSS colour; defaults to the accent gold. */
  color?: string;
  height?: number;
  className?: string;
};

export function ProgressBar({
  progress,
  label,
  sublabel,
  color = 'var(--hof-accent)',
  height = 14,
  className,
}: Props) {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  const percent = Math.round(clamped * 100);

  return (
    <div className={cn('w-full', className)}>
      {(label || sublabel) && (
        <div className="mb-1 flex items-baseline justify-between gap-3">
          {label && <span className="text-sm font-semibold text-ink">{label}</span>}
          {sublabel && <span className="shrink-0 text-xs text-muted">{sublabel}</span>}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Voortgang'}
        style={{ height }}
        className="w-full overflow-hidden rounded-full bg-edge"
      >
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 12px -2px ${color}` }}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ type: 'spring', damping: 26, stiffness: 120 }}
        />
      </div>
    </div>
  );
}

type RingProps = {
  /** 0–1 */
  progress: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: React.ReactNode;
};

/** Animated circular progress ring used on the rewards hero. */
export function ProgressRing({
  progress,
  size = 180,
  stroke = 12,
  color = 'var(--hof-accent)',
  children,
}: RingProps) {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--hof-border)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - clamped) }}
          transition={{ type: 'spring', damping: 28, stiffness: 90 }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}
