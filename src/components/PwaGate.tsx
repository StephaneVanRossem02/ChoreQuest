import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, RefreshCw, WifiOff, X } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/Button';

/**
 * The three things a service worker makes possible, and the UI for each:
 * install to the home screen, tell the user a new version is waiting, and say
 * plainly when the connection is gone.
 *
 * Updates are offered rather than applied. Swapping the running code out from
 * under someone mid-quest is the kind of "helpful" that loses a photo upload.
 */

/** Chrome fires this instead of showing its own install UI. */
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const INSTALL_DISMISSED = 'chorequest_install_dismissed';

export function PwaGate() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.error('Service worker registratie mislukt', error);
    },
  });

  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [offline, setOffline] = useState(() => !navigator.onLine);

  useEffect(() => {
    function onPrompt(e: Event) {
      // Keep the event so the install can be offered on our own terms, in
      // Dutch, at a moment that is not mid-task.
      e.preventDefault();
      try {
        if (localStorage.getItem(INSTALL_DISMISSED) === 'yes') return;
      } catch {
        // A blocked localStorage just means the banner can come back later.
      }
      setInstallEvent(e as InstallPromptEvent);
    }

    function onInstalled() {
      setInstallEvent(null);
    }

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  useEffect(() => {
    const goOnline = () => setOffline(false);
    const goOffline = () => setOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  async function handleInstall() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  }

  function dismissInstall() {
    setInstallEvent(null);
    try {
      localStorage.setItem(INSTALL_DISMISSED, 'yes');
    } catch {
      // Not worth surfacing; the banner simply returns next session.
    }
  }

  return (
    <>
      {/* Offline banner — sits at the very top, above everything. */}
      <AnimatePresence>
        {offline && (
          <motion.div
            role="status"
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className="fixed inset-x-0 top-0 z-[150] flex items-center justify-center gap-2 bg-warning px-4 py-1.5 text-xs font-bold text-[#241610] safe-top"
          >
            <WifiOff className="size-3.5" aria-hidden="true" />
            Geen verbinding — je ziet het Hof zoals je het laatst achterliet
          </motion.div>
        )}
      </AnimatePresence>

      {/* Update waiting */}
      <AnimatePresence>
        {needRefresh && (
          <motion.div
            role="status"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            className="fixed inset-x-3 bottom-24 z-[150] mx-auto max-w-sm rounded-lg border border-secondary bg-card p-4 shadow-glow-lg lg:bottom-6"
          >
            <p className="font-extrabold text-ink">🐉 Een nieuwe versie van het Hof</p>
            <p className="mt-1 text-sm text-muted">
              Herlaad wanneer het jou uitkomt — je verliest niets.
            </p>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm" block onClick={() => setNeedRefresh(false)}>
                Later
              </Button>
              <Button size="sm" block className="flex-[2]" onClick={() => updateServiceWorker(true)}>
                <RefreshCw className="size-3.5" aria-hidden="true" />
                Herladen
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Install invitation */}
      <AnimatePresence>
        {installEvent && !needRefresh && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            className="fixed inset-x-3 bottom-24 z-[140] mx-auto max-w-sm rounded-lg border border-primary bg-card p-4 shadow-glow-lg lg:bottom-6"
          >
            <button
              type="button"
              onClick={dismissInstall}
              aria-label="Niet installeren"
              className="absolute right-2 top-2 rounded-full p-1 text-muted transition-colors hover:text-ink"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
            <p className="pr-6 font-extrabold text-ink">🏰 Zet het Hof op je beginscherm</p>
            <p className="mt-1 text-sm text-muted">
              Opent schermvullend en werkt ook zonder verbinding.
            </p>
            <Button size="sm" block className="mt-3" onClick={handleInstall}>
              <Download className="size-3.5" aria-hidden="true" />
              Installeren
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
