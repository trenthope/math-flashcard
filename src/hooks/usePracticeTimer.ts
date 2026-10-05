import { useEffect } from 'react';
import { usePracticeTimeStore } from '@/store/practiceTimeStore';

const TICK_MS = 1000;
// Stop counting after this long without a key press or tap, so a session
// left open on screen doesn't keep adding time
const IDLE_MS = 60_000;
// Save accumulated time this often, so closing the app loses little
const FLUSH_MS = 10_000;

/**
 * Accumulates time spent actively doing math while `active` is true and
 * saves it to the current user's daily total. Time doesn't count while the
 * page is hidden (another tab or app in front) or the player is idle.
 */
export function usePracticeTimer(active: boolean) {
  useEffect(() => {
    if (!active) return;

    let lastTick = Date.now();
    let lastInteraction = lastTick;
    let pending = 0;
    let lastFlush = lastTick;

    const flush = () => {
      if (pending > 0) usePracticeTimeStore.getState().addTime(pending);
      pending = 0;
      lastFlush = Date.now();
    };

    const tick = (visible = document.visibilityState === 'visible') => {
      const now = Date.now();
      // Cap each step so a throttled/suspended timer can't credit a gap
      const delta = Math.min(now - lastTick, TICK_MS * 2);
      lastTick = now;
      const counting = visible && now - lastInteraction <= IDLE_MS;
      if (counting) pending += delta;
      if (now - lastFlush >= FLUSH_MS) flush();
    };

    const onInteract = () => { lastInteraction = Date.now(); };
    const onHide = () => {
      tick();
      flush();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Credit the time up to the moment the page was hidden
        tick(true);
        flush();
      } else {
        // Coming back: start a fresh step instead of crediting the gap
        lastTick = Date.now();
      }
    };

    const interval = setInterval(() => tick(), TICK_MS);
    window.addEventListener('keydown', onInteract);
    window.addEventListener('pointerdown', onInteract);
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', onInteract);
      window.removeEventListener('pointerdown', onInteract);
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      tick();
      flush();
    };
  }, [active]);
}
