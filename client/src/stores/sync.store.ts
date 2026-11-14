import { create } from "zustand";

import { synchronizeData } from "../services/sync.service";
import { useAuthStore } from "./auth.store";
import { useNotificationsStore } from "./notifications.store";

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

    const previousStatus = get().status;

    set({
      status: "syncing",
      error: null,
    });

    const userId = useAuthStore.getState().user?.id;

    try {
      await synchronizeData();

      // Do not publish a result into a different account's session.
      if (
        userId &&
        useAuthStore.getState().user?.id !== userId
      ) {
        return;
      }

      const timestamp = new Date().toISOString();

      if (userId) {
        try {
          await saveLastSuccessfulSyncAt(
            timestamp,
            userId,
          );
        } catch {
          // Metadata failure must not invalidate successful synchronization.
        }
      }

      set({
        status: "synced",
        lastSyncedAt: timestamp,
        error: null,
      });

      if (previousStatus === "error") {
        void useNotificationsStore.getState().addNotification({
          title: "Synchronization restored",
          message: "Your data has synchronized successfully again.",
          category: "sync",
        });
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Synchronization failed.";

      set({
        status: "error",
        error: message,
      });

      // Notify only when transitioning into the error state.
      if (previousStatus !== "error") {
        void useNotificationsStore.getState().addNotification({
          title: "Synchronization failed",
          message:
            "Mind Vault could not synchronize your latest changes. Your local data remains available.",
          category: "sync",
        });
      }
    }
  },
}));