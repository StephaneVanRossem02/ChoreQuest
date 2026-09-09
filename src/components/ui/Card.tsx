import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const card = cva('relative overflow-hidden border bg-card', {
  variants: {
    tone: {
      plain: 'border-edge',
      primary: 'border-primary shadow-glow',
      secondary: 'border-secondary shadow-glow',
      success: 'border-success/50',
      error: 'border-error/40',
      muted: 'border-edge opacity-60',
    },
    radius: {
      md: 'rounded-md',
      lg: 'rounded-lg',
      xl: 'rounded-xl',
    },
  },
  defaultVariants: { tone: 'plain', radius: 'md' },
});

export type CardProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof card>;

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, tone, radius, ...props },
  ref
) {
  return <div ref={ref} className={cn(card({ tone, radius }), className)} {...props} />;
});

/**
 * The 2–3px gradient hairline that tops nearly every card in the native app.
 * Rendered as a sibling rather than a border so it can carry a gradient.
 */
export function CardGlowLine({
  className,
  from = 'from-primary',
  to = 'to-secondary',
}: {
  className?: string;
  from?: string;
  to?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn('h-[3px] w-full bg-gradient-to-r', from, to, className)}
    />
  );
}
