import { create } from "zustand";

import type {
  LocalNotification,
  NotificationCategory,
} from "../db/database";

import {
  getNotifications,
  createNotification,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearNotifications,
} from "../db/notifications.db";

interface NotificationsState {
  notifications: LocalNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;

  loadNotifications: () => Promise<void>;

  addNotification: (input: {
    title: string;
    message: string;
    category: NotificationCategory;
  }) => Promise<void>;

  markRead: (id: string, isRead?: boolean) => Promise<void>;
  markAllRead: () => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;

  reset: () => void;
}

const initialState = {
  notifications: [] as LocalNotification[],
  unreadCount: 0,
  loading: false,
  error: null as string | null,
};

export const useNotificationsStore = create<NotificationsState>(
  (set, get) => ({
    ...initialState,

    loadNotifications: async () => {
      set({
        loading: true,
        error: null,
      });

      try {
        const notifications = await getNotifications();

        set({
          notifications,
          unreadCount: notifications.filter(
            (notification) => !notification.isRead,
          ).length,
          loading: false,
        });
      } catch {
        set({
          loading: false,
          error: "Unable to load notifications.",
        });
      }
    },

    addNotification: async (input) => {
      try {
        await createNotification(input);
        await get().loadNotifications();
      } catch (error) {
        console.error(
          "Unable to create notification:",
          error,
        );
      }
    },

    markRead: async (id, isRead = true) => {
      try {
        await markNotificationRead(id, isRead);
        await get().loadNotifications();
      } catch {
        set({
          error: "Unable to update notification.",
        });
      }
    },

    markAllRead: async () => {
      try {
        await markAllNotificationsRead();
        await get().loadNotifications();
      } catch {
        set({
          error: "Unable to update notifications.",
        });
      }
    },

    removeNotification: async (id) => {
      try {
        await deleteNotification(id);
        await get().loadNotifications();
      } catch {
        set({
          error: "Unable to delete notification.",
        });
      }
    },

    clearAll: async () => {
      try {
        await clearNotifications();
        await get().loadNotifications();
      } catch {
        set({
          error: "Unable to clear notifications.",
        });
      }
    },

    reset: () => {
      set(initialState);
    },
  }),
);