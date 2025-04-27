import { useRef, useCallback } from 'react';

/**
 * useThrottle - React hook to throttle a callback or value update
 * @param callback - function to be called at most once per interval
 * @param interval - throttle interval in ms
 * @returns throttled function
 */
export function useThrottle<T extends (...args: any[]) => void>(
  callback: T,
  interval: number,
): T {
  const lastCall = useRef(0);
  const savedCallback = useRef(callback);
  savedCallback.current = callback;

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall.current >= interval) {
        lastCall.current = now;
        savedCallback.current(...args);
      }
    },
    [interval],
  ) as T;
}
