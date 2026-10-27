import { getAllActiveSchedulesWithTemplates } from '@/services/schedules';
import { hasPushSubscription } from '@/services/push';
import { supabase } from '@/lib/supabase';
import type { TaskSchedule, TaskScheduleWithTemplate, TaskTemplate } from '@/types';
import { getDateString } from '@/utils/date';
import {
  LAST_NUDGE_HOUR,
  MESSAGES,
  SAD_MESSAGES,
  SAD_NUDGES,
  SAD_TITLES,
  TITLES,
  randomItem,
} from '../../supabase/functions/_shared/reminderMessages';

/**
 * Local reminders, the fallback for when Web Push is not available.
 *
 * Real reminders come from the `send-reminders` Edge Function as push
 * messages (see services/push.ts), which also reach a closed app. When this
 * browser has a push subscription, nothing here runs, or every reminder
 * would arrive twice.
 *
 * Without push, the best a page can do is arm timers for the rest of today
 * while it is open and show a notification (or an in-app toast) when one is
 * due. Mobile browsers freeze hidden tabs, so this only works while the app is
 * on screen.
 */

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  return notificationsSupported() ? Notification.permission : 'unsupported';
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

/** In-app fallback so a reminder is not silently lost when permission is off. */
type ReminderListener = (title: string, body: string) => void;
let listener: ReminderListener | null = null;

export function onReminder(fn: ReminderListener | null): void {
  listener = fn;
}

async function fire(title: string, body: string, tag: string): Promise<void> {
  if (notificationsSupported() && Notification.permission === 'granted') {
    const options = { body, tag, icon: `${import.meta.env.BASE_URL}icon.png` };
    // Android Chrome throws on `new Notification()`; only a service worker
    // may show one there. Prefer the worker whenever there is one.
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg) {
        await reg.showNotification(title, options);
        return;
      }
      new Notification(title, options);
      return;
    } catch {
      // Fall through to the in-app toast.
    }
  }
  listener?.(title, body);
}

const timers: number[] = [];

function armAt(when: Date, title: string, body: string, tag: string): void {
  const delay = when.getTime() - Date.now();
  // setTimeout overflows past ~24.8 days; anything beyond today is out of scope
  // anyway, since we re-arm on every launch.
  if (delay <= 0 || delay > 24 * 60 * 60 * 1000) return;
  timers.push(window.setTimeout(() => void fire(title, body, tag), delay));
}

function isDueToday(schedule: TaskSchedule, todayStr: string): boolean {
  const today = new Date();
  if (schedule.recurrence_type === 'once') return schedule.once_date === todayStr;
  if (schedule.recurrence_type === 'daily') return true;
  if (schedule.recurrence_type === 'weekly') return schedule.recurrence_day === today.getDay();
  if (schedule.recurrence_type === 'monthly') return schedule.recurrence_day === today.getDate();
  return false;
}

function scheduleReminder(schedule: TaskScheduleWithTemplate, template: TaskTemplate): void {
  if (!schedule.reminder_enabled) return;
  const [hours, minutes] = schedule.time_of_day.split(':').map(Number);
  const now = new Date();
  const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);

  armAt(at, randomItem(TITLES), randomItem(MESSAGES)(template.name), `quest-${schedule.id}`);

  // Hourly "the dragon is disappointed" nudges, never past LAST_NUDGE_HOUR.
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), LAST_NUDGE_HOUR, 0, 0);
  for (let i = 1; i <= SAD_NUDGES; i++) {
    const fireAt = new Date(at.getTime() + i * 60 * 60 * 1000);
    if (fireAt > endOfDay) break;
    armAt(
      fireAt,
      randomItem(SAD_TITLES),
      randomItem(SAD_MESSAGES)(template.name),
      `quest-sad-${schedule.id}-${i}`
    );
  }
}

export function cancelAllNotifications(): void {
  timers.forEach((t) => window.clearTimeout(t));
  timers.length = 0;
}

/** Re-arm just after midnight, for an app that stays open overnight. */
function armMidnight(): void {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 1, 0);
  timers.push(
    window.setTimeout(() => {
      rescheduleAllNotifications().catch(() => {});
    }, next.getTime() - now.getTime())
  );
}

export async function rescheduleAllNotifications(): Promise<void> {
  cancelAllNotifications();
  if (notificationPermission() === 'denied') return;
  // The server is sending these already.
  if (await hasPushSubscription().catch(() => false)) return;
  armMidnight();

  const todayStr = getDateString();
  const schedules = await getAllActiveSchedulesWithTemplates();

  const { data: completedToday } = await supabase
    .from('task_instances')
    .select('schedule_id')
    .eq('due_date', todayStr)
    .not('completed_at', 'is', null);
  const completedIds = new Set((completedToday ?? []).map((r) => r.schedule_id));

  for (const schedule of schedules) {
    if (completedIds.has(schedule.id)) continue;
    if (!isDueToday(schedule, todayStr)) continue;
    scheduleReminder(schedule, schedule.task_templates);
  }
}
