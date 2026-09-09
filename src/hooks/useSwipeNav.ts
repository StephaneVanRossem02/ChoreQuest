import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';

const BASE_TABS = ['/today', '/calendar', '/rewards', '/ranking', '/tasks'] as const;

const MIN_DISTANCE = 60;
const MAX_DRIFT_RATIO = 2.5;
const MAX_DURATION_MS = 600;

/**
 * Touch equivalent of the native app's PanResponder tab swipe: a quick,
 * mostly-horizontal drag moves to the neighbouring tab. Mouse drags are
 * deliberately ignored — on desktop the sidebar is the way around.
 */
export function useSwipeNav(currentPath: string) {
  const navigate = useNavigate();
  const { isAdmin } = useAuthContext();
  const ref = useRef<HTMLDivElement | null>(null);

  const tabsRef = useRef<string[]>([]);
  tabsRef.current = isAdmin ? [...BASE_TABS, '/admin'] : [...BASE_TABS];
  const pathRef = useRef(currentPath);
  pathRef.current = currentPath;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let startX = 0;
    let startY = 0;
    let startedAt = 0;
    let tracking = false;

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      startedAt = Date.now();
      tracking = true;
    }

    function onTouchEnd(e: TouchEvent) {
      if (!tracking) return;
      tracking = false;

      const t = e.changedTouches[0];
      if (!t) return;

      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const elapsed = Date.now() - startedAt;

      if (elapsed > MAX_DURATION_MS) return;
      if (Math.abs(dx) < MIN_DISTANCE) return;
      if (Math.abs(dx) < Math.abs(dy) * MAX_DRIFT_RATIO) return;

      const tabs = tabsRef.current;
      const index = tabs.indexOf(pathRef.current);
      if (index === -1) return;

      if (dx < 0 && index < tabs.length - 1) navigate(tabs[index + 1]);
      else if (dx > 0 && index > 0) navigate(tabs[index - 1]);
    }

    node.addEventListener('touchstart', onTouchStart, { passive: true });
    node.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      node.removeEventListener('touchstart', onTouchStart);
      node.removeEventListener('touchend', onTouchEnd);
    };
  }, [navigate]);

  return ref;
}
