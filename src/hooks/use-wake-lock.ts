import { useEffect } from "react";

/**
 * Keeps the screen awake while `active` is true (Cook Mode).
 * Re-acquires the lock when the tab becomes visible again, since browsers
 * release wake locks on backgrounding.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    if (typeof navigator === "undefined") return;

    let sentinel: any = null;
    let cancelled = false;

    const request = async () => {
      try {
        const wl = (navigator as any).wakeLock;
        if (!wl?.request) return;
        sentinel = await wl.request("screen");
        if (cancelled) {
          sentinel?.release?.();
          sentinel = null;
        }
      } catch {
        /* denied or unsupported — ignore */
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") void request();
    };

    void request();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      try {
        sentinel?.release?.();
      } catch {
        /* noop */
      }
      sentinel = null;
    };
  }, [active]);
}
