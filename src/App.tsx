import { useEffect, useState } from 'react';
import { HashRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuthContext } from '@/contexts/AuthContext';
import { AppProvider } from '@/contexts/AppContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { UIProvider, useUI } from '@/contexts/UIContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AppLayout } from '@/components/AppLayout';
import { Spinner } from '@/components/ui/Spinner';

import { LoginPage } from '@/features/auth/LoginPage';
import { OnboardingPage, isOnboardingDone } from '@/features/auth/OnboardingPage';
import { TodayPage } from '@/features/today/TodayPage';
import { CalendarPage } from '@/features/calendar/CalendarPage';
import { MonthDetailPage } from '@/features/calendar/MonthDetailPage';
import { RewardsPage } from '@/features/rewards/RewardsPage';
import { RankingPage } from '@/features/ranking/RankingPage';
import { TasksPage } from '@/features/tasks/TasksPage';
import { TaskTemplateFormPage } from '@/features/tasks/TaskTemplateFormPage';
import { ProfilePage } from '@/features/profile/ProfilePage';
import { AdminDashboardPage } from '@/features/admin/AdminDashboardPage';
import { AdminUserDetailPage } from '@/features/admin/AdminUserDetailPage';
import { AdminRewardsPage } from '@/features/admin/AdminRewardsPage';

import { onReminder, rescheduleAllNotifications } from '@/services/notifications';

/** Signed-in users only; anyone else lands on the login screen. */
function RequireAuth() {
  const { user, loading } = useAuthContext();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

/** Admin-only branch of the router. */
function RequireAdmin() {
  const { isAdmin, loading } = useAuthContext();
  if (loading) return <Spinner />;
  if (!isAdmin) return <Navigate to="/today" replace />;
  return <Outlet />;
}

/**
 * Reminders live here rather than in a screen so they survive navigation, and
 * route to an in-app toast whenever the browser will not show a notification.
 */
function ReminderRunner() {
  const { user } = useAuthContext();
  const { toast } = useUI();

  useEffect(() => {
    onReminder((title, body) => toast(title, body));
    return () => onReminder(null);
  }, [toast]);

  useEffect(() => {
    if (!user) return;
    rescheduleAllNotifications().catch(() => {});
  }, [user]);

  return null;
}

function Shell() {
  const { user, loading } = useAuthContext();
  const [showOnboarding, setShowOnboarding] = useState(() => !isOnboardingDone());

  if (loading) return <Spinner />;

  // First-run tour, shown once a court member has actually signed in.
  if (user && showOnboarding) {
    return <OnboardingPage onDone={() => setShowOnboarding(false)} />;
  }

  return (
    <>
      <ReminderRunner />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/today" replace /> : <LoginPage />} />

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/today" element={<TodayPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/calendar/:monthKey" element={<MonthDetailPage />} />
            <Route path="/rewards" element={<RewardsPage />} />
            <Route path="/ranking" element={<RankingPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/tasks/new" element={<TaskTemplateFormPage />} />
            <Route path="/tasks/:templateId" element={<TaskTemplateFormPage />} />
            <Route path="/profile" element={<ProfilePage />} />

            <Route element={<RequireAdmin />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/rewards" element={<AdminRewardsPage />} />
              <Route path="/admin/users/:userId" element={<AdminUserDetailPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to={user ? '/today' : '/login'} replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <UIProvider>
          <AuthProvider>
            <AppProvider>
              {/* HashRouter, not BrowserRouter: GitHub Pages serves static files
                  with no rewrite rule, so a deep link like /tasks/new would 404
                  on refresh. Hash routes are handled entirely client-side. */}
              <HashRouter>
                <Shell />
              </HashRouter>
            </AppProvider>
          </AuthProvider>
        </UIProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
