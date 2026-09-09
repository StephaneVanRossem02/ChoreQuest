import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarDays, Home, ListTodo, Shield, Trophy, Medal } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useSwipeNav } from '@/hooks/useSwipeNav';
import { cn } from '@/lib/utils';

type NavItem = {
  to: string;
  label: string;
  icon: typeof Home;
  adminOnly?: boolean;
};

const NAV: NavItem[] = [
  { to: '/today', label: 'Today', icon: Home },
  { to: '/calendar', label: 'Kalender', icon: CalendarDays },
  { to: '/rewards', label: 'Beloningen', icon: Trophy },
  { to: '/ranking', label: 'Ranking', icon: Medal },
  { to: '/tasks', label: 'Taken', icon: ListTodo },
  { to: '/admin', label: 'Beheer', icon: Shield, adminOnly: true },
];

/** The top-level path a nested route belongs to, e.g. /tasks/new -> /tasks. */
function rootPath(pathname: string): string {
  return `/${pathname.split('/')[1] ?? ''}`;
}

export function AppLayout() {
  const { isAdmin } = useAuthContext();
  const location = useLocation();
  const items = NAV.filter((item) => !item.adminOnly || isAdmin);
  const current = rootPath(location.pathname);
  const swipeRef = useSwipeNav(current);

  return (
    <div className="min-h-dvh bg-bg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:font-bold focus:text-white"
      >
        Naar inhoud
      </a>

      <div className="lg:flex">
        {/* Desktop sidebar */}
        <nav
          aria-label="Hoofdnavigatie"
          className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-1 border-r border-edge bg-card-deep p-4 lg:flex"
        >
          <div className="mb-6 px-2 pt-2">
            <p className="text-xs font-extrabold tracking-[0.25em] text-primary">🐉 HOF DER</p>
            <p className="text-glow text-xl font-black text-ink">DRAKEN</p>
          </div>
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-bold transition-colors',
                  isActive
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted hover:bg-card-elevated hover:text-ink'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="sidebar-active"
                      className="absolute inset-y-1 left-0 w-1 rounded-full bg-primary"
                      transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                    />
                  )}
                  <Icon className="size-5 shrink-0" aria-hidden="true" />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Content */}
        <div ref={swipeRef} className="min-w-0 flex-1">
          <main
            id="main"
            className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4 safe-top sm:px-6 lg:max-w-4xl lg:pb-12"
          >
            {/* Keyed on the path so each route remounts and plays its entrance.
                Deliberately NOT wrapped in <AnimatePresence mode="wait">: under
                React 19's StrictMode that combination can leave the outgoing
                child mounted at opacity 0 and never mount the incoming one,
                which reads as a blank page on every navigation. */}
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </main>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Hoofdnavigatie"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-edge bg-card-deep/95 backdrop-blur-md safe-bottom lg:hidden"
      >
        <ul className="mx-auto flex max-w-3xl">
          {items.map(({ to, label, icon: Icon }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    'relative flex flex-col items-center gap-1 px-1 py-2.5 text-[0.65rem] font-bold transition-colors',
                    isActive ? 'text-primary' : 'text-muted hover:text-ink'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="tab-active"
                        className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-primary"
                        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                      />
                    )}
                    <Icon className="size-5" aria-hidden="true" />
                    <span className="truncate">{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
