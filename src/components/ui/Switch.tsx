import { cn } from '@/lib/utils';

type Props = {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
  tone?: 'primary' | 'secondary';
};

/** Accessible toggle standing in for React Native's <Switch>. */
export function Switch({ checked, onChange, label, disabled, tone = 'primary' }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border-2 transition-colors duration-200',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked
          ? tone === 'primary'
            ? 'border-primary bg-primary'
            : 'border-secondary bg-secondary'
          : 'border-edge bg-card-elevated'
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none block size-5 rounded-full bg-white shadow transition-transform duration-200',
          checked ? 'translate-x-[1.375rem]' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}
