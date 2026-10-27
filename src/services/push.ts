import { supabase } from '@/lib/supabase';

/**
 * Web Push: the only way to reach someone whose app is closed.
 *
 * The browser subscribes with the push service of its vendor, using our VAPID
 * public key; the subscription goes to Supabase (save_push_subscription), and
 * the `send-reminders` Edge Function pushes to it when a quest is due. The
 * service worker (src/sw.ts) turns each push into a notification.
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? '';

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    VAPID_PUBLIC_KEY.length > 0
  );
}

/**
 * iOS only allows push for an app added to the home screen. In Safari itself
 * PushManager is simply missing, which would read as "not supported" when the
 * real answer is "install it first".
 */
export function needsHomeScreenInstall(): boolean {
  if (typeof window === 'undefined') return false;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * `serviceWorker.ready` never settles when no worker is registered (dev mode,
 * or a registration that failed), so give up after a while instead of
 * hanging the caller.
 */
async function readyRegistration(timeoutMs = 10_000): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => window.setTimeout(() => resolve(null), timeoutMs)),
  ]);
}

/** Is this browser subscribed right now? Cheap enough to call on every launch. */
export async function hasPushSubscription(): Promise<boolean> {
  if (!pushSupported()) return false;
  const reg = await readyRegistration(3_000);
  return !!(await reg?.pushManager.getSubscription());
}

/**
 * Subscribe (or reuse the existing subscription) and store it for the
 * signed-in user. Needs notification permission already granted.
 */
export async function enablePush(): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== 'granted') return false;
  const reg = await readyRegistration();
  if (!reg) return false;

  const key = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
  let sub = await reg.pushManager.getSubscription();

  // A subscription made with another VAPID key (after rotating keys) can
  // never receive our pushes; replace it.
  const currentKey = sub?.options.applicationServerKey;
  if (sub && currentKey && !sameBytes(new Uint8Array(currentKey), key)) {
    await sub.unsubscribe().catch(() => {});
    sub = null;
  }

  sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });

  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

  const { error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: json.endpoint,
    p_p256dh: json.keys.p256dh,
    p_auth: json.keys.auth,
    p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    p_user_agent: navigator.userAgent.slice(0, 300),
  });
  if (error) {
    // The server does not know this subscription (008 not run yet, or
    // offline), so nothing will ever be pushed to it. Drop it, or the local
    // timers would stand down for a push that never comes.
    await sub.unsubscribe().catch(() => {});
    throw error;
  }
  return true;
}

/**
 * Forget this browser, for sign-out: otherwise the next person to log in on
 * this device would get the previous one's reminders until they enable their own.
 */
export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  const reg = await readyRegistration(3_000);
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe().catch(() => {});
}

/** Ask the Edge Function for a test push to all of this user's devices. */
export async function sendTestPush(): Promise<{ devices: number; delivered: number }> {
  const { data, error } = await supabase.functions.invoke('send-reminders', { body: { test: true } });
  if (error) throw error;
  return data as { devices: number; delivered: number };
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}
