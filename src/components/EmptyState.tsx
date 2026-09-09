import { motion } from 'framer-motion';

type Props = {
  emoji: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
};

export function EmptyState({ emoji, title, subtitle, action }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col items-center justify-center gap-2 px-8 py-16 text-center"
    >
      <span aria-hidden="true" className="mb-2 text-6xl motion-safe:animate-float">
        {emoji}
      </span>
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      {subtitle && <p className="max-w-sm text-sm leading-relaxed text-muted">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  );
}
