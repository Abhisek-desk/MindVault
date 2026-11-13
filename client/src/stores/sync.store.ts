import { create } from "zustand";

import { synchronizeData } from "../services/sync.service";
import { useAuthStore } from "./auth.store";

import {
  saveLastSuccessfulSyncAt,
} from "../db/sync.db";

type SyncStatus =
  | "idle"
  | "syncing"
  | "synced"
  | "error"
  | "offline";

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
    set({
      status: "offline",
    });
  },

  syncNow: async () => {
    if (!navigator.onLine) {
      set({
        status: "offline",
      });

      return;
    }

    if (get().status === "syncing") {
      return;
    }

    set({
      status: "syncing",
      error: null,
    });

    const userId = useAuthStore.getState().user?.id;

    try {
      await synchronizeData();

      const timestamp = new Date().toISOString();

      // Persist only when the authenticated account
      // remains the same after synchronization.
      if (
        userId &&
        useAuthStore.getState().user?.id === userId
      ) {
        try {
          await saveLastSuccessfulSyncAt(
            timestamp,
            userId,
          );
        } catch {
          // A metadata persistence failure must not
          // invalidate an otherwise successful sync.
        }
      }

      set({
        status: "synced",
        lastSyncedAt: timestamp,
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