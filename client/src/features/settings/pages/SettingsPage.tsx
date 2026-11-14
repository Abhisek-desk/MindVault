import { useEffect, useState } from "react";
import {
  BellRing,
  Check,
  Cloud,
  Database,
  Loader2,
  Monitor,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  motion,
  useReducedMotion,
} from "motion/react";

import Sidebar from "../../dashboard/components/Sidebar";
import DashboardHeader from "../../dashboard/components/DashboardHeader";

import {
  DEFAULT_APP_SETTINGS,
  type LocalAppSettings,
} from "../../../db/database";

import {
  getAppSettings,
  updateAppSettings,
  resetAppSettings,
} from "../../../db/settings.db";

import { useAuthStore } from "../../../stores/auth.store";

interface SettingToggleProps {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  saving?: boolean;
  onChange: (value: boolean) => void;
}

const SettingToggle = ({
  title,
  description,
  checked,
  disabled = false,
  saving = false,
  onChange,
}: SettingToggleProps) => (
  <div className="flex items-center justify-between gap-5 py-5">
    <div className="min-w-0">
      <h3 className="font-semibold text-[#17243D]">
        {title}
      </h3>

      <p className="mt-1 text-sm leading-6 text-[#596273]">
        {description}
      </p>
    </div>

    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={title}
      disabled={disabled || saving}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-[#B83E32]" : "bg-gray-300"
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  </div>
);

function SettingsPage() {
  const shouldReduceMotion = useReducedMotion();

  const user = useAuthStore((state) => state.user);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [settings, setSettings] =
    useState<LocalAppSettings>(DEFAULT_APP_SETTINGS);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [storage, setStorage] = useState<{
    usage: number;
    quota: number;
  } | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [online, setOnline] = useState(navigator.onLine);

  const reduceMotion =
    Boolean(shouldReduceMotion) || settings.reducedMotion;

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      try {
        const saved = await getAppSettings();

        if (!cancelled) {
          setSettings(saved);
        }

        if (navigator.storage?.estimate) {
          const estimate = await navigator.storage.estimate();

          if (!cancelled) {
            setStorage({
              usage: estimate.usage ?? 0,
              quota: estimate.quota ?? 0,
            });
          }
        }
      } catch {
        if (!cancelled) {
          setError("Unable to load your settings.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  const saveSetting = async (
    key: keyof Omit<
      LocalAppSettings,
      "id" | "updatedAt"
    >,
    value: boolean,
  ) => {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const updated = await updateAppSettings({
        [key]: value,
      });

      setSettings(updated);
      setMessage("Your preference has been saved.");
    } catch {
      setError("Unable to save this preference.");
    } finally {
      setSaving(false);
    }
  };

  const enableBrowserNotifications = async () => {
    if (typeof Notification === "undefined") {
      setError(
        "Browser notifications are not supported by this browser.",
      );
      return;
    }

    try {
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setError(
          "Browser notification permission was not granted.",
        );
        return;
      }

      await saveSetting("browserNotifications", true);
    } catch {
      setError("Unable to enable browser notifications.");
    }
  };

  const resetSettings = async () => {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const defaults = await resetAppSettings();

      setSettings(defaults);
      setMessage("Settings restored to their defaults.");
    } catch {
      setError("Unable to reset your settings.");
    } finally {
      setSaving(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F1E5]">
        <Loader2
          className="animate-spin text-[#B83E32]"
          size={34}
        />
      </div>
    );
  }

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
            initial={reduceMotion ? false : { opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.35, ease: "easeOut" }
            }
          >
            <div className="mb-8">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#B83E32]">
                <Sparkles size={18} />
                PERSONALIZE YOUR EXPERIENCE
              </div>

              <h1 className="text-3xl font-bold md:text-4xl">
                Settings
              </h1>

              <p className="mt-2 text-sm text-[#596273] md:text-base">
                Manage your preferences and control how Mind Vault works.
              </p>
            </div>

            {(message || error) && (
              <div
                role={error ? "alert" : "status"}
                className={`mb-6 rounded-xl border p-4 text-sm ${
                  error
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-green-200 bg-green-50 text-green-800"
                }`}
              >
                {error || message}
              </div>
            )}

            {/* ACCOUNT */}

            <section className="mb-6 rounded-2xl border border-[#17243D]/10 bg-[#FFFAF1] p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <ShieldCheck size={22} />
                </div>

                <div>
                  <h2 className="text-lg font-bold">
                    Account Information
                  </h2>

                  <p className="text-sm text-[#596273]">
                    Your current Mind Vault account
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-[#F8F1E5] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#596273]">
                    Name
                  </p>

                  <p className="mt-2 font-semibold">
                    {user?.name || "Not available"}
                  </p>
                </div>

                <div className="rounded-xl bg-[#F8F1E5] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#596273]">
                    Email
                  </p>

                  <p className="mt-2 break-all font-semibold">
                    {user?.email || "Not available"}
                  </p>
                </div>

                <div className="rounded-xl bg-[#F8F1E5] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#596273]">
                    Preferred Language
                  </p>

                  <p className="mt-2 font-semibold">
                    {user?.preferredLanguage || "Not specified"}
                  </p>
                </div>

                <div className="rounded-xl bg-[#F8F1E5] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#596273]">
                    Connection
                  </p>

                  <p className="mt-2 flex items-center gap-2 font-semibold">
                    {online ? (
                      <>
                        <Wifi
                          size={17}
                          className="text-green-700"
                        />
                        Online
                      </>
                    ) : (
                      <>
                        <WifiOff
                          size={17}
                          className="text-orange-700"
                        />
                        Offline
                      </>
                    )}
                  </p>
                </div>
              </div>

              <p className="mt-4 text-xs text-[#596273]">
                Account information is currently read-only.
              </p>
            </section>

            {/* SYNCHRONIZATION */}

            <section className="mb-6 rounded-2xl border border-[#17243D]/10 bg-[#FFFAF1] p-6">
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-700">
                  <Cloud size={22} />
                </div>

                <div>
                  <h2 className="text-lg font-bold">
                    Synchronization
                  </h2>

                  <p className="text-sm text-[#596273]">
                    Control background synchronization.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-[#17243D]/10">
                <SettingToggle
                  title="Automatic Sync"
                  description="Automatically synchronize your changes when an internet connection is available."
                  checked={settings.autoSync}
                  saving={saving}
                  onChange={(value) =>
                    void saveSetting("autoSync", value)
                  }
                />
              </div>
            </section>

            {/* NOTIFICATIONS */}

            <section className="mb-6 rounded-2xl border border-[#17243D]/10 bg-[#FFFAF1] p-6">
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                  <BellRing size={22} />
                </div>

                <div>
                  <h2 className="text-lg font-bold">
                    Notifications
                  </h2>

                  <p className="text-sm text-[#596273]">
                    Decide how Mind Vault keeps you informed.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-[#17243D]/10">
                <SettingToggle
                  title="In-App Notifications"
                  description="Save activity notifications in your Notifications Center."
                  checked={settings.inAppNotifications}
                  saving={saving}
                  onChange={(value) =>
                    void saveSetting("inAppNotifications", value)
                  }
                />

                <div className="flex items-center justify-between gap-5 py-5">
                  <div className="min-w-0">
                    <h3 className="font-semibold">
                      Browser Notifications
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-[#596273]">
                      Receive browser notifications when Mind Vault creates
                      an event. Requires your browser permission.
                    </p>

                    {typeof Notification !== "undefined" && (
                      <p className="mt-2 text-xs text-[#596273]">
                        Permission: {Notification.permission}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      if (settings.browserNotifications) {
                        void saveSetting(
                          "browserNotifications",
                          false,
                        );
                      } else {
                        void enableBrowserNotifications();
                      }
                    }}
                    className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
                      settings.browserNotifications
                        ? "border border-[#17243D]/20 text-[#17243D] hover:bg-[#F8F1E5]"
                        : "bg-[#17243D] text-white hover:bg-[#263958]"
                    }`}
                  >
                    {settings.browserNotifications
                      ? "Enabled"
                      : "Enable"}
                  </button>
                </div>
              </div>
            </section>

            {/* ACCESSIBILITY */}

            <section className="mb-6 rounded-2xl border border-[#17243D]/10 bg-[#FFFAF1] p-6">
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                  <Monitor size={22} />
                </div>

                <div>
                  <h2 className="text-lg font-bold">
                    Accessibility
                  </h2>

                  <p className="text-sm text-[#596273]">
                    Adjust interface motion.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-[#17243D]/10">
                <SettingToggle
                  title="Reduce Motion"
                  description="Reduce non-essential animations on this page. System-level reduced-motion preferences are also respected."
                  checked={settings.reducedMotion}
                  saving={saving}
                  onChange={(value) =>
                    void saveSetting("reducedMotion", value)
                  }
                />
              </div>
            </section>

            {/* STORAGE */}

            <section className="mb-6 rounded-2xl border border-[#17243D]/10 bg-[#FFFAF1] p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                  <Database size={22} />
                </div>

                <div>
                  <h2 className="text-lg font-bold">
                    Local Storage
                  </h2>

                  <p className="text-sm text-[#596273]">
                    Browser storage information.
                  </p>
                </div>
              </div>

              {storage && storage.quota > 0 ? (
                <>
                  <div className="mb-3 flex justify-between text-sm">
                    <span className="text-[#596273]">
                      Origin storage used
                    </span>

                    <span className="font-semibold">
                      {formatBytes(storage.usage)}
                    </span>
                  </div>

                  <div
                    className="h-3 overflow-hidden rounded-full bg-[#17243D]/10"
                    role="progressbar"
                    aria-label="Browser origin storage usage"
                    aria-valuenow={Math.round(
                      (storage.usage / storage.quota) * 100,
                    )}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full rounded-full bg-[#B83E32]"
                      style={{
                        width: `${Math.min(
                          100,
                          (storage.usage / storage.quota) * 100,
                        )}%`,
                      }}
                    />
                  </div>

                  <p className="mt-3 text-xs text-[#596273]">
                    Estimated browser storage capacity:{" "}
                    {formatBytes(storage.quota)}. This estimate includes
                    storage used by this website's origin, not just Mind
                    Vault's database.
                  </p>
                </>
              ) : (
                <p className="text-sm text-[#596273]">
                  Storage estimates are not available in this browser.
                </p>
              )}
            </section>

            {/* RESET */}

            <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#17243D]/10 bg-[#FFFAF1] p-6">
              <div>
                <h2 className="font-bold">
                  Restore Default Settings
                </h2>

                <p className="mt-1 text-sm text-[#596273]">
                  Restore your local preferences to their default values.
                  Your notes and downloaded packs will not be deleted.
                </p>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  if (
                    window.confirm(
                      "Restore all preferences to their default values?",
                    )
                  ) {
                    void resetSettings();
                  }
                }}
                className="flex items-center gap-2 rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
              >
                <RotateCcw size={17} />
                Reset Settings
              </button>
            </section>

            {saving && (
              <div className="mt-5 flex items-center justify-center gap-2 text-sm text-[#596273]">
                <Loader2
                  size={16}
                  className="animate-spin"
                />
                Saving preferences...
              </div>
            )}

            <div className="mt-8 flex items-center justify-center gap-2 text-xs text-[#596273]">
              <Check size={14} />
              Your preferences are stored locally on this device.
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}

export default SettingsPage;