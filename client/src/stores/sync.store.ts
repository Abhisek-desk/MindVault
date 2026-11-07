import { create } from "zustand";
import { synchronizeData } from "../services/sync.service";

type SyncStatus = "idle" | "syncing" | "synced" | "error" | "offline";

interface SyncState {
  status: SyncStatus;
  lastSyncedAt: string | null;
  error: string | null;
  syncNow: () => Promise<void>;
  setOffline: () => void;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  status: navigator.onLine ? "idle" : "offline",
  lastSyncedAt: null,
  error: null,

  setOffline: () => {
    set({ status: "offline" });
  },

  syncNow: async () => {
    if (!navigator.onLine) {
      set({ status: "offline" });
      return;
    }

    if (get().status === "syncing") {
      return;
    }

    set({
      status: "syncing",
      error: null,
    });

    try {
      await synchronizeData();

      set({
        status: "synced",
        lastSyncedAt: new Date().toISOString(),
        error: null,
      });
    } catch (error) {
      set({
        status: "error",
        error:
          error instanceof Error
            ? error.message
            : "Synchronization failed.",
      });
    }
  },
}));
