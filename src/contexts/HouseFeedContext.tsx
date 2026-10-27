import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useUI } from '@/contexts/UIContext';
import { subscribeHousehold, type HouseEvent } from '@/services/realtime';

type HouseFeedValue = {
  /**
   * Bumped on every household event. Screens depend on it to refetch, which
   * keeps the wiring one-directional: realtime never reaches into a page's
   * state, it just says "something moved".
   */
  revision: number;
  /** The most recent event, for anything that wants the detail. */
  latest: HouseEvent | null;
};

const HouseFeedContext = createContext<HouseFeedValue>({ revision: 0, latest: null });

export function HouseFeedProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthContext();
  const { toast } = useUI();
  const [revision, setRevision] = useState(0);
  const [latest, setLatest] = useState<HouseEvent | null>(null);

  // The subscription is set up once per signed-in user; keeping `toast` in a
  // ref stops a new toast identity from tearing down the websocket.
  const toastRef = useRef(toast);
  toastRef.current = toast;

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeHousehold(user.id, (event) => {
      setLatest(event);
      setRevision((n) => n + 1);

      // Your own actions already have a celebration overlay or a toast of
      // their own; announcing them twice is noise.
      if (event.isMe) return;

      // Deliberately silent. A sibling finishing the dishes should not make a
      // sound in someone else's room at 22:00 — the toast is enough.
      switch (event.kind) {
        case 'completed':
          toastRef.current(
            `${event.icon} ${event.who} volbracht een queeste`,
            `${event.taskName} — +${event.points} XP`,
            'success'
          );
          break;
        case 'claimed':
          toastRef.current(
            `🗡️ ${event.who} nam een queeste aan`,
            `${event.taskName} is van het Prijzenbord`
          );
          break;
        case 'released':
          toastRef.current(
            `📜 ${event.taskName} staat weer vrij`,
            `${event.who} heeft de queeste teruggelegd`
          );
          break;
      }
    });

    return unsubscribe;
  }, [user]);

  const value = useMemo(() => ({ revision, latest }), [revision, latest]);

  return <HouseFeedContext.Provider value={value}>{children}</HouseFeedContext.Provider>;
}

export function useHouseFeed(): HouseFeedValue {
  return useContext(HouseFeedContext);
}
