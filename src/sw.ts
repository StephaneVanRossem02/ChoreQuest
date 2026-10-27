/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

/**
 * The service worker, written by hand (vite-plugin-pwa `injectManifest`)
 * because the generated one cannot receive push messages.
 *
 * It does three things: precache the app shell so it opens offline, wait for
 * the user to accept an update (PwaGate sends SKIP_WAITING), and turn a push
 * from the `send-reminders` Edge Function into a notification, even when no
 * tab is open.
 */

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Hash routes are all the same document, so every navigation resolves to
// index.html; that is what makes the app open offline. Supabase is never
// answered from cache: a stale session is worse than an honest failure.
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    denylist: [/^\/api/, /supabase\.co/],
  })
);

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

/** What `send-reminders` puts in a push. Every field is optional on purpose. */
type ReminderPush = {
  title?: string;
  body?: string;
  tag?: string;
  /** Hash route to open on click, e.g. "#/today". */
  url?: string;
};

self.addEventListener('push', (event) => {
  let data: ReminderPush = {};
  try {
    data = (event.data?.json() as ReminderPush) ?? {};
  } catch {
    // A push without JSON still deserves a notification; Chrome even warns
    // when a push ends without one.
    data = { body: event.data?.text() };
  }

  const scope = self.registration.scope;
  event.waitUntil(
    self.registration.showNotification(data.title ?? '🐉 Hof der Draken', {
      body: data.body ?? 'Er wacht een queeste op je.',
      tag: data.tag,
      icon: `${scope}icon.png`,
      badge: `${scope}icon.png`,
      data: { url: data.url ?? '#/today' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(
    (event.notification.data as { url?: string } | null)?.url ?? '#/today',
    self.registration.scope
  ).href;

  event.waitUntil(
    (async () => {
      // Reuse an open window of the app rather than stacking new ones.
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windows) {
        if (client.url.startsWith(self.registration.scope)) {
          await client.focus();
          if ('navigate' in client) await (client as WindowClient).navigate(target).catch(() => {});
          return;
        }
      }
      await self.clients.openWindow(target);
    })()
  );
});
