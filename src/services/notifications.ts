import { getAllActiveSchedulesWithTemplates } from '@/services/schedules';
import { supabase } from '@/lib/supabase';
import type { TaskSchedule, TaskScheduleWithTemplate, TaskTemplate } from '@/types';
import { getDateString } from '@/utils/date';

/**
 * Web replacement for expo-notifications.
 *
 * The browser has no equivalent of an OS-scheduled local notification: without
 * a push server there is no way to wake a closed tab. What we can do is arm
 * timers for the rest of today while the app is open, and fire a real
 * Notification (or an in-app toast, if permission was denied) when one is due.
 * Reminders are re-armed on every launch and whenever schedules change, so a
 * user who keeps the app open on a phone or desktop still gets nudged.
 */

const MESSAGES = [
  (name: string) => `🐉 De draak wacht niet — tijd voor: ${name}!`,
  (name: string) => `✨ Het hof eist je aanwezigheid! Queeste: ${name}`,
  (name: string) => `🌙 De nacht fluistert... vergeet ${name} niet, ridder!`,
  (name: string) => `⭐ Jouw XP wacht op je! Voltooi: ${name}`,
  (name: string) => `🌹 Een heldin verwaarloost haar queeste niet: ${name}`,
  (name: string) => `🔮 De magie vervliegt als je ${name} vergeet!`,
  (name: string) => `👑 Je troon vergt inspanning: ${name}`,
  (name: string) => `🌿 Het woud fluistert: ${name} moet gedaan worden`,
  (name: string) => `🐉 Vlieg hoog, drakenridder! ${name} staat op je lijst`,
  (name: string) => `💜 Rhysand zou dit niet vergeten — ${name} wacht op jou!`,
  (name: string) => `🌟 Sterren verlichten je pad: ${name} is jouw queeste!`,
  (name: string) => `⚔️ Maak je zwaard gereed voor: ${name}!`,
];

const SAD_MESSAGES = [
  (name: string) => `😔 ${name} wacht nog steeds... De draak is teleurgesteld.`,
  (name: string) => `💔 Rhysand kijkt toe met droeve ogen — ${name} is nog niet voltooid.`,
  (name: string) => `🌧️ Het Hof zucht. ${name} blijft ongedaan, ridder.`,
  (name: string) => `🕯️ De kaarsen in het Hof doven... ${name} wacht op jou.`,
  (name: string) => `🌙 De uren verstrijken en ${name} is nog steeds niet klaar. Kom.`,
  (name: string) => `😢 Zelfs de draak verliest zijn geduld... ${name} moet nu!`,
];

const TITLES = [
  '🐉 Queeste van het Hof',
  '✨ Magische Herinnering',
  '🌙 Nacht Hof Roept',
  '👑 Jouw Missie Wacht',
  '🌹 Hof der Dromen',
  '🔮 Magische Queeste',
];

const SAD_TITLES = [
  '💔 Queeste verwaarloosd',
  '😔 Het Hof wacht nog steeds',
  '🌧️ Ridder, waar ben je?',
  '🕯️ De tijd verstrijkt...',
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

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

function fire(title: string, body: string, tag: string): void {
  if (notificationsSupported() && Notification.permission === 'granted') {
    try {
      new Notification(title, { body, tag, icon: `${import.meta.env.BASE_URL}icon.png` });
      return;
    } catch {
      // Some browsers throw when constructing notifications outside a service
      // worker; fall through to the in-app toast.
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
  timers.push(window.setTimeout(() => fire(title, body, tag), delay));
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

  // Up to four hourly "the dragon is disappointed" nudges, never past 23:00.
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 0, 0);
  for (let i = 1; i <= 4; i++) {
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

export async function rescheduleAllNotifications(): Promise<void> {
  cancelAllNotifications();
  if (notificationPermission() === 'denied') return;

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
