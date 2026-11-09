import { useEffect } from "react";

import { useAuthStore } from "../../stores/auth.store";
import { useSyncStore } from "../../stores/sync.store";

async function checkInternetConnection(): Promise<boolean> {
  if (!navigator.onLine) {
    return false;
  }

  const controller = new AbortController();

  const timeout = window.setTimeout(
    () => controller.abort(),
    4000
  );

  try {
    const response = await fetch("/api/v1/health", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    return response.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
}

function SyncManager() {
  const isAuthenticated = useAuthStore(
    (state) => state.isAuthenticated
  );

  const syncNow = useSyncStore((state) => state.syncNow);
  const setOffline = useSyncStore((state) => state.setOffline);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let mounted = true;
    let wasOnline = false;
    let checking = false;
    let lastSyncAttempt = 0;

    const RETRY_INTERVAL = 30000;

    const verifyAndSync = async () => {
      if (checking || !mounted) return;

      checking = true;

      try {
        const connected = await checkInternetConnection();

        if (!mounted) return;

        if (!connected) {
          wasOnline = false;
          setOffline();
          return;
        }

        const now = Date.now();

        // Internet has just been restored.
        if (!wasOnline) {
          wasOnline = true;
          lastSyncAttempt = now;

          if (import.meta.env.DEV) {
            console.log(
              "Internet restored. Starting synchronization."
            );
          }

          await syncNow();
          return;
        }

        // Retry failed synchronization every 30 seconds.
        const syncStatus = useSyncStore.getState().status;

        if (
          syncStatus === "error" &&
          now - lastSyncAttempt >= RETRY_INTERVAL
        ) {
          lastSyncAttempt = now;

          if (import.meta.env.DEV) {
            console.log(
              "Retrying failed synchronization."
            );
          }

          await syncNow();
        }
      } finally {
        checking = false;
      }
    };

    const handleOffline = () => {
      wasOnline = false;
      setOffline();
    };

    const handleOnline = () => {
      void verifyAndSync();
    };

    // Check immediately when authenticated.
    void verifyAndSync();

    // Check connectivity every 10 seconds.
    const interval = window.setInterval(() => {
      void verifyAndSync();
    }, 10000);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      mounted = false;

      window.clearInterval(interval);

      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isAuthenticated, syncNow, setOffline]);

  return null;
}

export default SyncManager;