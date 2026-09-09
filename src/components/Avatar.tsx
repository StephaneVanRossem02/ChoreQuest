import { cn } from '@/lib/utils';

type Props = {
  url?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
  ringClassName?: string;
};

/**
 * Twemoji avatar with an initial fallback. Used everywhere a person appears:
 * ranking rows, the calendar log, admin lists and the task assignment picker.
 */
export function Avatar({ url, name, size = 40, className, ringClassName }: Props) {
  const initial = (name ?? '?').trim().charAt(0).toUpperCase() || '?';
  const hasImage = Boolean(url);

  return (
    <div
      style={{ width: size, height: size }}
      className={cn(
        'grid shrink-0 place-items-center overflow-hidden rounded-full border-2',
        hasImage ? 'border-edge bg-[#1c1917]' : 'border-primary bg-primary/20',
        ringClassName,
        className
      )}
    >
      {hasImage ? (
        <img
          src={url ?? ''}
          alt=""
          loading="lazy"
          decoding="async"
          style={{ width: size * 0.72, height: size * 0.72 }}
          className="object-contain"
        />
      ) : (
        <span
          aria-hidden="true"
          style={{ fontSize: size * 0.42 }}
          className="font-black text-primary"
        >
          {initial}
        </span>
      )}
    </div>
  );
}
