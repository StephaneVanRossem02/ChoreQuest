import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Avatar } from '@/components/Avatar';
import { useAuthContext } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export function ProfileButton() {
  const { user, avatarUrl } = useAuthContext();

  return (
    <Link
      to="/profile"
      aria-label="Profiel openen"
      className="shrink-0 rounded-full transition-transform hover:scale-105 active:scale-95"
    >
      <Avatar url={avatarUrl} name={user?.email} size={40} />
    </Link>
  );
}

type Props = {
  /** ReactNode, not string: Today puts the live dragon-mood glyph in here. */
  eyebrow: React.ReactNode;
  title: string;
  subtitle?: string;
  /** Colour token for the eyebrow and title glow. */
  tone?: 'primary' | 'secondary';
  actions?: React.ReactNode;
  showProfile?: boolean;
};

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  tone = 'primary',
  actions,
  showProfile = true,
}: Props) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-4 flex items-start justify-between gap-4"
    >
      <div className="min-w-0">
        <p
          className={cn(
            'flex items-center gap-2 text-xs font-extrabold tracking-[0.25em]',
            tone === 'primary' ? 'text-primary' : 'text-secondary'
          )}
        >
          {eyebrow}
        </p>
        <h1
          className={cn(
            'text-glow truncate text-2xl font-black sm:text-3xl',
            tone === 'primary' ? 'text-ink' : 'text-ink'
          )}
        >
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {actions}
        {showProfile && <ProfileButton />}
      </div>
    </motion.header>
  );
}
