import {
  db,
  withDatabaseLease,
  type LocalNotification,
  type NotificationCategory,
} from "./database";

const createId = (): string => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const getNotifications = async (): Promise<LocalNotification[]> =>
  withDatabaseLease(async () =>
    db.notifications.orderBy("createdAt").reverse().toArray(),
  );

export const getUnreadNotificationCount = async (): Promise<number> =>
  withDatabaseLease(async () => {
    const notifications = await db.notifications.toArray();
    return notifications.filter((notification) => !notification.isRead).length;
  });

export const createNotification = async (input: {
  title: string;
  message: string;
  category: NotificationCategory;
}): Promise<LocalNotification | null> =>
  withDatabaseLease(async () => {
    const settings = await db.settings.get("app-settings");

    if (settings?.inAppNotifications === false) {
      return null;
    }

    const notification: LocalNotification = {
      id: createId(),
      title: input.title.trim().slice(0, 120),
      message: input.message.trim().slice(0, 500),
      category: input.category,
      createdAt: new Date().toISOString(),
      isRead: false,
    };

    if (!notification.title || !notification.message) {
      throw new Error("Notification title and message are required.");
    }

    await db.notifications.add(notification);

    if (
      settings?.browserNotifications === true &&
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      try {
        new Notification(notification.title, {
          body: notification.message,
          tag: notification.id,
        });
      } catch {
        // Browser notification failures must not affect in-app storage.
      }
    }

    return notification;
  });

export const markNotificationRead = async (
  id: string,
  isRead = true,
): Promise<void> =>
  withDatabaseLease(async () => {
    await db.notifications.update(id, { isRead });
  });

export const markAllNotificationsRead = async (): Promise<void> =>
  withDatabaseLease(async () => {
    const notifications = await db.notifications.toArray();

    await db.notifications.bulkPut(
      notifications.map((notification) => ({
        ...notification,
        isRead: true,
      })),
    );
  });

export const deleteNotification = async (id: string): Promise<void> =>
  withDatabaseLease(async () => {
    await db.notifications.delete(id);
  });

export const clearNotifications = async (): Promise<void> =>
  withDatabaseLease(async () => {
    await db.notifications.clear();
  });

export const getNotificationsByCategory = async (
  category: NotificationCategory,
): Promise<LocalNotification[]> =>
  withDatabaseLease(async () => {
    const notifications = await db.notifications
      .where("category")
      .equals(category)
      .toArray();

    return notifications.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  });