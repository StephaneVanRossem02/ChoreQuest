import { forwardRef, useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

const FIELD =
  'w-full rounded-md border-2 border-edge bg-bg/80 px-4 py-3 text-base text-ink ' +
  'placeholder:text-muted transition-colors duration-200 ' +
  'hover:border-edge-deep focus:border-primary focus:outline-none';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, hint, error, id, ...props },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1 block text-sm font-extrabold tracking-wide text-primary-light">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(FIELD, error && 'border-error', className)}
        {...props}
      />
      {hint && !error && (
        <p id={`${inputId}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${inputId}-error`} className="mt-1 text-xs font-semibold text-error">
          {error}
        </p>
      )}
    </div>
  );
});

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, label, id, ...props },
  ref
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={fieldId} className="mb-1 block text-sm font-extrabold tracking-wide text-primary-light">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={fieldId}
        className={cn(FIELD, 'min-h-24 resize-y', className)}
        {...props}
      />
    </div>
  );
});

type PasswordInputProps = Omit<InputProps, 'type'>;

/** Password field with the smooth visibility toggle the brief calls for. */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className, label, hint, error, id, ...props }, ref) {
    const autoId = useId();
    const inputId = id ?? autoId;
    const [visible, setVisible] = useState(false);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1 block text-sm font-extrabold tracking-wide text-primary-light">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={visible ? 'text' : 'password'}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className={cn(FIELD, 'pr-12', error && 'border-error', className)}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Wachtwoord verbergen' : 'Wachtwoord tonen'}
            aria-pressed={visible}
            className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted transition-colors hover:text-primary"
          >
            <span className="relative block size-5">
              <Eye
                aria-hidden="true"
                className={cn(
                  'absolute inset-0 size-5 transition-all duration-200',
                  visible ? 'scale-75 opacity-0' : 'scale-100 opacity-100'
                )}
              />
              <EyeOff
                aria-hidden="true"
                className={cn(
                  'absolute inset-0 size-5 transition-all duration-200',
                  visible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
                )}
              />
            </span>
          </button>
        </div>
        {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
        {error && (
          <p id={`${inputId}-error`} className="mt-1 text-xs font-semibold text-error">
            {error}
          </p>
        )}
      </div>
    );
  }
);
