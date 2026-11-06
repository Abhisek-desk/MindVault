import { useEffect } from "react";
import { synchronizeData } from "../services/sync.service";

export const useAutoSync = (): void => {
  useEffect(() => {
    let mounted = true;

    const runSync = async () => {
      if (!mounted || !navigator.onLine) return;

      try {
        await synchronizeData();
      } catch (error) {
        console.error("Automatic sync failed:", error);
      }
    };

    // Sync when the application starts.
    void runSync();

    // Sync when internet connectivity returns.
    window.addEventListener("online", runSync);

    // Sync when the user returns to the application.
    document.addEventListener("visibilitychange", runSync);

    return () => {
      mounted = false;

      window.removeEventListener("online", runSync);
      document.removeEventListener("visibilitychange", runSync);
    };
  }, []);
};