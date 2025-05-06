// hooks/usePolling.ts
import { useEffect, useRef, useState } from "react";

export function usePolling(
  callback: () => Promise<void>,
  interval: number,
  dependencies: any[] = []
) {
  const savedCallback = useRef<() => Promise<void>>();
  const [isActive, setIsActive] = useState(true);

  // Remember latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the polling
  useEffect(() => {
    if (!isActive) return;

    let timeoutId: NodeJS.Timeout;
    let isMounted = true;

    const tick = async (retryCount = 0) => {
      if (!isMounted) return;

      try {
        await savedCallback.current?.();
      } catch (error) {
        console.error("Polling error:", error);
        if (retryCount < 2) {
          // Retry up to 2 times
          await new Promise((res) => setTimeout(res, 5000));
          await tick(retryCount + 1);
        }
      } finally {
        if (isMounted && isActive) {
          timeoutId = setTimeout(tick, interval);
        }
      }
    };

    // Start polling
    tick();

    // Cleanup
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [interval, isActive, ...dependencies]);

  return { isActive, setIsActive };
}
