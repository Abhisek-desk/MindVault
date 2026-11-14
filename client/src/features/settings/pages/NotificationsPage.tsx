import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  BellOff,
  BookOpen,
  Check,
  CheckCheck,
  Cloud,
  Download,
  Filter,
  Loader2,
  Trash2,
} from "lucide-react";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";

import Sidebar from "../../dashboard/components/Sidebar";
import DashboardHeader from "../../dashboard/components/DashboardHeader";

import type {
  LocalNotification,
  NotificationCategory,
} from "../../../db/database";

import { useNotificationsStore } from "../../../stores/notifications.store";

type FilterType = "all" | "unread" | NotificationCategory;

function NotificationsPage() {
  const shouldReduceMotion = useReducedMotion();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");

  const {
    notifications,
    unreadCount,
    loading,
    error,
    loadNotifications,
    markRead,
    markAllRead,
    removeNotification,
    clearAll,
  } = useNotificationsStore();

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const filteredNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter(
        (notification) => !notification.isRead,
      );
    }

    if (filter === "all") {
      return notifications;
    }

    return notifications.filter(
      (notification) => notification.category === filter,
    );
  }, [notifications, filter]);

  const formatDate = (date: string) => {
    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "Unknown date";
    }

    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(parsed);
  };

  const categoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case "sync":
        return <Cloud size={19} />;

      case "downloads":
        return <Download size={19} />;

      case "learning":
        return <BookOpen size={19} />;

      default:
        return <Bell size={19} />;
    }
  };

  const categoryColor = (category: NotificationCategory) => {
    switch (category) {
      case "sync":
        return "bg-blue-100 text-blue-700";

      case "downloads":
        return "bg-green-100 text-green-700";

      case "learning":
        return "bg-purple-100 text-purple-700";

      default:
        return "bg-orange-100 text-orange-700";
    }
  };

  const filterOptions: {
    id: FilterType;
    label: string;
  }[] = [
    { id: "all", label: "All" },
    { id: "unread", label: "Unread" },
    { id: "system", label: "System" },
    { id: "sync", label: "Sync" },
    { id: "downloads", label: "Downloads" },
    { id: "learning", label: "Learning" },
  ];

  const NotificationCard = ({
    notification,
  }: {
    notification: LocalNotification;
  }) => (
    <motion.article
      layout={!shouldReduceMotion}
      initial={
        shouldReduceMotion
          ? false
          : { opacity: 0, y: 12 }
      }
      animate={{ opacity: 1, y: 0 }}
      exit={
        shouldReduceMotion
          ? undefined
          : { opacity: 0, scale: 0.97 }
      }
      className={`rounded-2xl border p-5 transition ${
        notification.isRead
          ? "border-[#17243D]/10 bg-[#FFFAF1]"
          : "border-[#B83E32]/25 bg-white shadow-sm"
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${categoryColor(
            notification.category,
          )}`}
        >
          {categoryIcon(notification.category)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-bold">
                {notification.title}
              </h3>

              <p className="mt-1 text-xs font-medium capitalize text-[#B83E32]">
                {notification.category}
              </p>
            </div>

            {!notification.isRead && (
              <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#B83E32]" />
            )}
          </div>

          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-[#596273]">
            {notification.message}
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <time
              dateTime={notification.createdAt}
              className="text-xs text-[#596273]"
            >
              {formatDate(notification.createdAt)}
            </time>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  void markRead(
                    notification.id,
                    !notification.isRead,
                  )
                }
                className="rounded-lg p-2 text-[#596273] transition hover:bg-[#F8F1E5] hover:text-[#17243D]"
                title={
                  notification.isRead
                    ? "Mark as unread"
                    : "Mark as read"
                }
                aria-label={
                  notification.isRead
                    ? "Mark notification as unread"
                    : "Mark notification as read"
                }
              >
                {notification.isRead ? (
                  <Bell size={17} />
                ) : (
                  <Check size={17} />
                )}
              </button>

              <button
                type="button"
                onClick={() =>
                  void removeNotification(notification.id)
                }
                className="rounded-lg p-2 text-red-600 transition hover:bg-red-50"
                title="Delete notification"
                aria-label="Delete notification"
              >
                <Trash2 size={17} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );

  return (
    <div className="flex min-h-screen bg-[#F8F1E5] text-[#17243D]">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="min-w-0 flex-1">
        <DashboardHeader
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="mx-auto max-w-5xl px-5 py-8 md:px-8">
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#B83E32]">
                  <Bell size={18} />
                  YOUR ACTIVITY
                </div>

                <h1 className="text-3xl font-bold md:text-4xl">
                  Notifications
                </h1>

                <p className="mt-2 text-sm text-[#596273] md:text-base">
                  Your activity and important updates, stored on this device.
                </p>
              </div>

              <div className="rounded-2xl bg-[#17243D] px-5 py-3 text-white">
                <p className="text-xs text-white/70">
                  Unread notifications
                </p>
                <p className="text-2xl font-bold">
                  {unreadCount}
                </p>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            {/* FILTERS */}

            <section className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Filter size={17} className="text-[#596273]" />

                {filterOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setFilter(option.id)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                      filter === option.id
                        ? "bg-[#17243D] text-white"
                        : "border border-[#17243D]/10 bg-[#FFFAF1] text-[#596273] hover:bg-white"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={unreadCount === 0}
                  onClick={() => void markAllRead()}
                  className="flex items-center gap-2 rounded-xl border border-[#17243D]/15 bg-[#FFFAF1] px-3 py-2.5 text-xs font-semibold transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <CheckCheck size={16} />
                  Mark all read
                </button>

                <button
                  type="button"
                  disabled={notifications.length === 0}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Delete all notifications? This cannot be undone.",
                      )
                    ) {
                      void clearAll();
                    }
                  }}
                  className="flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 size={16} />
                  Clear all
                </button>
              </div>
            </section>

            {/* NOTIFICATION LIST */}

            {loading ? (
              <div className="flex min-h-64 items-center justify-center">
                <Loader2
                  size={32}
                  className="animate-spin text-[#B83E32]"
                />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border-2 border-dashed border-[#17243D]/20 bg-[#FFFAF1] px-6 py-16 text-center"
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F8F1E5]">
                  <BellOff size={32} className="text-[#596273]" />
                </div>

                <h2 className="text-xl font-bold">
                  {notifications.length === 0
                    ? "You're all caught up"
                    : "No notifications found"}
                </h2>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#596273]">
                  {notifications.length === 0
                    ? "Important updates about your learning, downloads and synchronization will appear here."
                    : "There are no notifications matching this filter."}
                </p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {filteredNotifications.map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}

            <p className="mt-8 text-center text-xs text-[#596273]">
              Notifications are stored locally and remain available offline.
            </p>
          </motion.div>
        </main>
      </div>
    </div>
  );
}

export default NotificationsPage;