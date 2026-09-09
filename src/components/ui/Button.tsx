import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const button = cva(
  'inline-flex items-center justify-center gap-2 rounded-md font-extrabold tracking-wide ' +
    'transition-[transform,box-shadow,background-color,border-color,color] duration-200 ' +
    'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55 ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
  {
    variants: {
      variant: {
        // The signature ember gradient from the native app's primary actions.
        primary:
          'bg-gradient-to-r from-primary to-secondary text-white shadow-glow hover:shadow-glow-lg',
        solid: 'bg-primary text-white shadow-glow hover:brightness-110',
        outline:
          'border-2 border-edge bg-card text-muted hover:border-primary hover:text-primary',
        ghost: 'text-muted hover:bg-card-elevated hover:text-ink',
        danger: 'border-2 border-error/50 bg-card text-error hover:bg-error hover:text-white',
      },
      size: {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2.5 text-sm',
        lg: 'px-6 py-3.5 text-base',
        icon: 'size-10 p-0',
      },
      block: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'primary', size: 'md', block: false },
  }
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof button>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, block, type = 'button', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(button({ variant, size, block }), className)}
      {...props}
    />
  );
});
