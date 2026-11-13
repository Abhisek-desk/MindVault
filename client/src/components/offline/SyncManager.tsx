import { useEffect } from "react";

import { useAuthStore } from "../../stores/auth.store";
import { useSyncStore } from "../../stores/sync.store";

import {
  getLastSuccessfulSyncAt,
} from "../../db/sync.db";

async function checkInternetConnection(): Promise<boolean> {
  if (!navigator.onLine) {
    return false;
  }

  const controller = new AbortController();

  const timeout = window.setTimeout(
    () => controller.abort(),
    4000,
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
    (state) => state.isAuthenticated,
  );

  const isDatabaseReady = useAuthStore(
    (state) => state.isDatabaseReady,
  );

  const userId = useAuthStore(
    (state) => state.user?.id,
  );

  const syncNow = useSyncStore(
    (state) => state.syncNow,
  );

  const setOffline = useSyncStore(
    (state) => state.setOffline,
  );

  useEffect(() => {
    if (!isAuthenticated || !isDatabaseReady || !userId) {
      useSyncStore.setState({
        lastSyncedAt: null,
      });

      return;
    }

    let mounted = true;
    let wasOnline = false;
    let checking = false;
    let lastSyncAttempt = 0;

    const RETRY_INTERVAL = 30000;

    // Restore the account-specific last sync timestamp.
    void getLastSuccessfulSyncAt()
      .then((timestamp) => {
        if (mounted) {
          useSyncStore.setState({
            lastSyncedAt: timestamp,
          });
        }
      })
      .catch(() => {
        if (mounted) {
          useSyncStore.setState({
            lastSyncedAt: null,
          });
        }
      });

    const verifyAndSync = async () => {
      if (checking || !mounted) {
        return;
      }

      checking = true;

      try {
        const connected = await checkInternetConnection();

        if (!mounted) {
          return;
        }

        if (!connected) {
          wasOnline = false;

          setOffline();

          return;
        }

        const now = Date.now();

        if (!wasOnline) {
          wasOnline = true;
          lastSyncAttempt = now;

          await syncNow();

          return;
        }

        const syncStatus =
          useSyncStore.getState().status;

        if (
          syncStatus === "error" &&
          now - lastSyncAttempt >= RETRY_INTERVAL
        ) {
          lastSyncAttempt = now;

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

    void verifyAndSync();

    const interval = window.setInterval(() => {
      void verifyAndSync();
    }, 30000);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      mounted = false;

      window.clearInterval(interval);

      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [
    isAuthenticated,
    isDatabaseReady,
    userId,
    syncNow,
    setOffline,
  ]);

  return null;
}

export default SyncManager;