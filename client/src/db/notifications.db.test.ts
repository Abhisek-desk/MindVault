import "fake-indexeddb/auto";

import Dexie from "dexie";
import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  db,
  initializeUserDatabase,
} from "./database";

import {
  clearNotifications,
  createNotification,
  deleteNotification,
  getNotifications,
  getNotificationsByCategory,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "./notifications.db";

import { updateAppSettings } from "./settings.db";

const accountA = "507f1f77bcf86cd799439011";
const accountB = "507f191e810c19729de860ea";

beforeEach(async () => {
  await db.delete();
  await db.open();

  await initializeUserDatabase(accountA);
});

afterAll(async () => {
  await db.delete();

  await Dexie.delete(`MindVaultDatabase_${accountA}`);
  await Dexie.delete(`MindVaultDatabase_${accountB}`);
  await Dexie.delete("MindVaultDatabase_anonymous");
  await Dexie.delete("MindVaultDatabase");
});

// =====================================
// NOTIFICATION CREATION
// =====================================

describe("Notification creation", () => {
  it("creates and persists a notification", async () => {
    const notification = await createNotification({
      title: "Lesson completed",
      message: "You completed JavaScript basics.",
      category: "learning",
    });

    expect(notification).not.toBeNull();
    expect(notification?.id).toBeTruthy();
    expect(notification?.title).toBe("Lesson completed");
    expect(notification?.message).toBe(
      "You completed JavaScript basics.",
    );
    expect(notification?.category).toBe("learning");
    expect(notification?.isRead).toBe(false);

    const saved = await db.notifications.get(notification!.id);

    expect(saved).toEqual(notification);
  });

  it("trims whitespace from notification content", async () => {
    const notification = await createNotification({
      title: "  Sync completed  ",
      message: "  Your data is synchronized.  ",
      category: "sync",
    });

    expect(notification?.title).toBe("Sync completed");
    expect(notification?.message).toBe(
      "Your data is synchronized.",
    );
  });

  it("rejects an empty notification title", async () => {
    await expect(
      createNotification({
        title: "   ",
        message: "A valid message",
        category: "system",
      }),
    ).rejects.toThrow(
      "Notification title and message are required.",
    );

    expect(await db.notifications.count()).toBe(0);
  });

  it("rejects an empty notification message", async () => {
    await expect(
      createNotification({
        title: "A valid title",
        message: "   ",
        category: "system",
      }),
    ).rejects.toThrow(
      "Notification title and message are required.",
    );

    expect(await db.notifications.count()).toBe(0);
  });

  it("limits notification titles to 120 characters", async () => {
    const notification = await createNotification({
      title: "T".repeat(150),
      message: "Test message",
      category: "system",
    });

    expect(notification?.title).toHaveLength(120);
  });

  it("limits notification messages to 500 characters", async () => {
    const notification = await createNotification({
      title: "Test",
      message: "M".repeat(600),
      category: "system",
    });

    expect(notification?.message).toHaveLength(500);
  });

  it("does not create notifications when in-app notifications are disabled", async () => {
    await updateAppSettings({
      inAppNotifications: false,
    });

    const notification = await createNotification({
      title: "Should not appear",
      message: "Notifications are disabled.",
      category: "system",
    });

    expect(notification).toBeNull();
    expect(await db.notifications.count()).toBe(0);
  });
});

// =====================================
// NOTIFICATION RETRIEVAL
// =====================================

describe("Notification retrieval", () => {
  it("returns notifications in newest-first order", async () => {
    await db.notifications.bulkPut([
      {
        id: "notification-old",
        title: "Older notification",
        message: "Older message",
        category: "system",
        createdAt: "2026-01-01T10:00:00.000Z",
        isRead: false,
      },
      {
        id: "notification-new",
        title: "Newer notification",
        message: "Newer message",
        category: "learning",
        createdAt: "2026-01-03T10:00:00.000Z",
        isRead: false,
      },
      {
        id: "notification-middle",
        title: "Middle notification",
        message: "Middle message",
        category: "sync",
        createdAt: "2026-01-02T10:00:00.000Z",
        isRead: true,
      },
    ]);

    const notifications = await getNotifications();

    expect(notifications.map((item) => item.id)).toEqual([
      "notification-new",
      "notification-middle",
      "notification-old",
    ]);
  });

  it("returns notifications belonging to a selected category", async () => {
    await db.notifications.bulkPut([
      {
        id: "learning-one",
        title: "Lesson completed",
        message: "First lesson",
        category: "learning",
        createdAt: "2026-01-01T10:00:00.000Z",
        isRead: false,
      },
      {
        id: "sync-one",
        title: "Sync completed",
        message: "Data synchronized",
        category: "sync",
        createdAt: "2026-01-02T10:00:00.000Z",
        isRead: false,
      },
      {
        id: "learning-two",
        title: "Course completed",
        message: "Second lesson",
        category: "learning",
        createdAt: "2026-01-03T10:00:00.000Z",
        isRead: true,
      },
    ]);

    const notifications =
      await getNotificationsByCategory("learning");

    expect(notifications).toHaveLength(2);

    expect(notifications.map((item) => item.id)).toEqual([
      "learning-two",
      "learning-one",
    ]);
  });

  it("returns zero unread notifications when the database is empty", async () => {
    expect(await getUnreadNotificationCount()).toBe(0);
  });

  it("counts only unread notifications", async () => {
    await db.notifications.bulkPut([
      {
        id: "unread-one",
        title: "First",
        message: "First message",
        category: "system",
        createdAt: new Date().toISOString(),
        isRead: false,
      },
      {
        id: "unread-two",
        title: "Second",
        message: "Second message",
        category: "sync",
        createdAt: new Date().toISOString(),
        isRead: false,
      },
      {
        id: "read-one",
        title: "Third",
        message: "Third message",
        category: "learning",
        createdAt: new Date().toISOString(),
        isRead: true,
      },
    ]);

    expect(await getUnreadNotificationCount()).toBe(2);
  });
});

// =====================================
// READ / UNREAD OPERATIONS
// =====================================

describe("Notification read status", () => {
  it("marks an individual notification as read", async () => {
    const notification = await createNotification({
      title: "Test",
      message: "Test message",
      category: "system",
    });

    await markNotificationRead(notification!.id);

    const saved = await db.notifications.get(notification!.id);

    expect(saved?.isRead).toBe(true);
    expect(await getUnreadNotificationCount()).toBe(0);
  });

  it("marks an individual notification as unread", async () => {
    const notification = await createNotification({
      title: "Test",
      message: "Test message",
      category: "system",
    });

    await markNotificationRead(notification!.id);
    await markNotificationRead(notification!.id, false);

    const saved = await db.notifications.get(notification!.id);

    expect(saved?.isRead).toBe(false);
    expect(await getUnreadNotificationCount()).toBe(1);
  });

  it("marks all notifications as read", async () => {
    await db.notifications.bulkPut([
      {
        id: "first",
        title: "First",
        message: "First message",
        category: "system",
        createdAt: new Date().toISOString(),
        isRead: false,
      },
      {
        id: "second",
        title: "Second",
        message: "Second message",
        category: "learning",
        createdAt: new Date().toISOString(),
        isRead: false,
      },
    ]);

    await markAllNotificationsRead();

    const notifications = await getNotifications();

    expect(notifications.every((item) => item.isRead)).toBe(true);
    expect(await getUnreadNotificationCount()).toBe(0);
  });
});

// =====================================
// DELETE OPERATIONS
// =====================================

describe("Notification deletion", () => {
  it("deletes an individual notification", async () => {
    const notification = await createNotification({
      title: "Temporary",
      message: "This will be deleted.",
      category: "system",
    });

    await deleteNotification(notification!.id);

    expect(
      await db.notifications.get(notification!.id),
    ).toBeUndefined();

    expect(await db.notifications.count()).toBe(0);
  });

  it("clears all notifications", async () => {
    await createNotification({
      title: "First",
      message: "First notification",
      category: "system",
    });

    await createNotification({
      title: "Second",
      message: "Second notification",
      category: "learning",
    });

    await clearNotifications();

    expect(await db.notifications.count()).toBe(0);
    expect(await getNotifications()).toHaveLength(0);
    expect(await getUnreadNotificationCount()).toBe(0);
  });
});

// =====================================
// ACCOUNT ISOLATION
// =====================================

describe("Notification account isolation", () => {
  it("keeps notifications separate between accounts", async () => {
    const accountANotification = await createNotification({
      title: "Account A notification",
      message: "Private notification for account A.",
      category: "system",
    });

    expect(accountANotification).not.toBeNull();

    await initializeUserDatabase(accountB);

    expect(await getNotifications()).toHaveLength(0);

    await createNotification({
      title: "Account B notification",
      message: "Private notification for account B.",
      category: "learning",
    });

    await initializeUserDatabase(accountA);

    const accountANotifications = await getNotifications();

    expect(accountANotifications).toHaveLength(1);

    expect(accountANotifications[0].title).toBe(
      "Account A notification",
    );

    expect(
      accountANotifications.some(
        (notification) =>
          notification.title === "Account B notification",
      ),
    ).toBe(false);
  });
});