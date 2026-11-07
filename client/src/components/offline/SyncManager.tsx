import { useEffect } from "react";

import { useAuthStore } from "../../stores/auth.store";
import { useSyncStore } from "../../stores/sync.store";

async function checkInternetConnection(): Promise<boolean> {
  if (!navigator.onLine) {
    return false;
  }

  try {
    const response = await fetch(
      "https://www.gstatic.com/generate_204",
      {
        method: "GET",
        mode: "no-cors",
        cache: "no-store",
        signal: AbortSignal.timeout(4000)
      }
    );

    return response.type === "opaque" || response.ok;
  } catch {
    return false;
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

        // Sync when internet becomes available.
        if (!wasOnline) {
          wasOnline = true;
          console.log("Internet restored. Starting synchronization.");
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

    // Recheck connectivity every 10 seconds.
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