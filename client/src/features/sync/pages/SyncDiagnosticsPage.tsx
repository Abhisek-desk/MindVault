import { useCallback, useEffect, useState } from "react";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react";

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cloud,
  CloudOff,
  Database,
  Loader2,
  RefreshCw,
  UploadCloud,
  Wifi,
  WifiOff,
  ArrowRight,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import Sidebar from "../../dashboard/components/Sidebar";
import DashboardHeader from "../../dashboard/components/DashboardHeader";

import {
  getLastSuccessfulSyncAt,
  getSyncDiagnostics,
  type SyncDiagnostics,
} from "../../../db/sync.db";

import { useSyncStore } from "../../../stores/sync.store";

// =====================================
// ANIMATION VARIANTS
// =====================================

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 18,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

// =====================================
// BACKEND CONNECTION CHECK
// =====================================

type BackendStatus =
  | "checking"
  | "reachable"
  | "unreachable"
  | "offline";

async function checkBackend(): Promise<boolean> {
  if (!navigator.onLine) {
    return false;
  }

  const controller = new AbortController();

  const timeout = window.setTimeout(
    () => controller.abort(),
    4000,
  );

  try {
    const response = await fetch("/api/v1/health", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    return response.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
}

// =====================================
// FORMAT DATE
// =====================================

function formatDate(value: string | null): string {
  if (!value) {
    return "No successful sync recorded";
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleString();
}

// =====================================
// DIAGNOSTIC CARD
// =====================================

interface DiagnosticCardProps {
  title: string;
  value: number | string;
  description: string;
  icon: typeof Activity;
  accent: string;
}

function DiagnosticCard({
  title,
  value,
  description,
  icon: Icon,
  accent,
}: DiagnosticCardProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      variants={
        shouldReduceMotion ? undefined : itemVariants
      }
      whileHover={
        shouldReduceMotion
          ? undefined
          : {
              y: -5,
              transition: { duration: 0.2 },
            }
      }
      className="rounded-2xl border border-[#17243D]/10 bg-[#FFFAF1] p-5 shadow-sm transition-shadow duration-300 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#596273]">
            {title}
          </p>

          <motion.p
            key={value}
            initial={
              shouldReduceMotion
                ? false
                : { opacity: 0, y: 8, scale: 0.95 }
            }
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            transition={{ duration: 0.3 }}
            className="mt-3 text-3xl font-bold text-[#17243D]"
          >
            {value}
          </motion.p>
        </div>

        <motion.div
          whileHover={
            shouldReduceMotion
              ? undefined
              : {
                  rotate: 8,
                  scale: 1.1,
                }
          }
          className={`rounded-xl p-3 ${accent}`}
        >
          <Icon size={22} />
        </motion.div>
      </div>

      <p className="mt-4 text-xs leading-5 text-[#596273]">
        {description}
      </p>
    </motion.div>
  );
}

// =====================================
// MAIN PAGE
// =====================================

function SyncDiagnosticsPage() {
  const navigate = useNavigate();

  const shouldReduceMotion = useReducedMotion();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [diagnostics, setDiagnostics] =
    useState<SyncDiagnostics>({
      pending: 0,
      processing: 0,
      failed: 0,
      conflicts: 0,
      totalQueued: 0,
    });

  const [lastSuccessfulSync, setLastSuccessfulSync] =
    useState<string | null>(null);

  const [backendStatus, setBackendStatus] =
    useState<BackendStatus>("checking");

  const [isOnline, setIsOnline] =
    useState(navigator.onLine);

  const [isLoading, setIsLoading] = useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [error, setError] = useState("");

  const syncStatus = useSyncStore(
    (state) => state.status,
  );

  const syncError = useSyncStore(
    (state) => state.error,
  );

  const lastSyncedAt = useSyncStore(
    (state) => state.lastSyncedAt,
  );

  const syncNow = useSyncStore(
    (state) => state.syncNow,
  );

  // =================================
  // LOAD DIAGNOSTICS
  // =================================

  const loadDiagnostics = useCallback(async () => {
    try {
      setError("");

      const [stats, timestamp, reachable] =
        await Promise.all([
          getSyncDiagnostics(),
          getLastSuccessfulSyncAt(),
          checkBackend(),
        ]);

      setDiagnostics(stats);

      setLastSuccessfulSync(timestamp);

      setBackendStatus(
        !navigator.onLine
          ? "offline"
          : reachable
            ? "reachable"
            : "unreachable",
      );
    } catch {
      setError(
        "Unable to load synchronization diagnostics. Please refresh.",
      );
    } finally {
      setIsLoading(false);

      setIsRefreshing(false);
    }
  }, []);

  // =================================
  // INITIAL LOAD AND AUTO REFRESH
  // =================================

  useEffect(() => {
    let mounted = true;

    const refresh = async () => {
      if (mounted) {
        await loadDiagnostics();
      }
    };

    const initialTimer = window.setTimeout(() => {
      void refresh();
    }, 0);

    const interval = window.setInterval(() => {
      void refresh();
    }, 15000);

    return () => {
      mounted = false;

      window.clearTimeout(initialTimer);

      window.clearInterval(interval);
    };
  }, [loadDiagnostics]);

  // =================================
  // ONLINE / OFFLINE EVENTS
  // =================================

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);

      void loadDiagnostics();
    };

    const handleOffline = () => {
      setIsOnline(false);

      setBackendStatus("offline");
    };

    window.addEventListener("online", handleOnline);

    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);

      window.removeEventListener("offline", handleOffline);
    };
  }, [loadDiagnostics]);

  // =================================
  // MANUAL REFRESH
  // =================================

  const handleRefresh = async () => {
    setIsRefreshing(true);

    await loadDiagnostics();
  };

  // =================================
  // MANUAL SYNCHRONIZATION
  // =================================

  const handleSync = async () => {
    await syncNow();

    await loadDiagnostics();
  };

  // =================================
  // STATUS DETAILS
  // =================================

  const statusDetails = {
    idle: {
      label: "Waiting to synchronize",
      color: "bg-gray-100 text-gray-700",
    },

    syncing: {
      label: "Synchronization in progress",
      color: "bg-blue-100 text-blue-700",
    },

    synced: {
      label: "Synchronization successful",
      color: "bg-green-100 text-green-700",
    },

    error: {
      label: "Synchronization failed",
      color: "bg-red-100 text-red-700",
    },

    offline: {
      label: "Waiting for connection",
      color: "bg-orange-100 text-orange-700",
    },
  };

  const currentStatus = statusDetails[syncStatus];

  const backendReachable = backendStatus === "reachable";

  // =================================
  // RENDER
  // =================================

  return (
    <div className="flex min-h-screen bg-[#F8F1E5]">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="min-w-0 flex-1">
        <DashboardHeader
          onMenuClick={() => setIsSidebarOpen(true)}
        />

        <motion.div
          initial={
            shouldReduceMotion ? false : { opacity: 0, y: 12 }
          }
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: shouldReduceMotion ? 0 : 0.35,
          }}
          className="mx-auto max-w-[1500px] space-y-8 p-5 md:p-8"
        >
          {/* PAGE HEADER */}

          <motion.section
            variants={
              shouldReduceMotion ? undefined : itemVariants
            }
            initial={shouldReduceMotion ? false : "hidden"}
            animate="visible"
            className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"
          >
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#B83E32]">
                <Activity size={18} />

                Synchronization Center
              </div>

              <h1 className="text-3xl font-bold text-[#17243D]">
                Sync Diagnostics
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#596273]">
                Monitor your local synchronization queue,
                connection health, and unresolved changes.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <motion.button
                whileHover={
                  shouldReduceMotion ? undefined : { y: -2 }
                }
                whileTap={
                  shouldReduceMotion ? undefined : { scale: 0.96 }
                }
                onClick={() => void handleRefresh()}
                disabled={isRefreshing}
                className="flex items-center justify-center gap-2 rounded-xl border border-[#17243D]/10 bg-white px-5 py-3 text-sm font-semibold text-[#17243D] transition hover:bg-[#FFFAF1] disabled:opacity-50"
              >
                <motion.span
                  animate={
                    isRefreshing && !shouldReduceMotion
                      ? { rotate: 360 }
                      : undefined
                  }
                  transition={{
                    duration: 1,
                    repeat: isRefreshing && !shouldReduceMotion
                      ? Infinity
                      : 0,
                    ease: "linear",
                  }}
                >
                  <RefreshCw size={16} />
                </motion.span>

                Refresh
              </motion.button>

              <motion.button
                whileHover={
                  shouldReduceMotion ? undefined : { y: -2 }
                }
                whileTap={
                  shouldReduceMotion ? undefined : { scale: 0.96 }
                }
                onClick={() => void handleSync()}
                disabled={!isOnline || syncStatus === "syncing"}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#17243D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#263958] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <motion.span
                  animate={
                    syncStatus === "syncing" && !shouldReduceMotion
                      ? { rotate: 360 }
                      : undefined
                  }
                  transition={{
                    duration: 1,
                    repeat: syncStatus === "syncing" && !shouldReduceMotion
                      ? Infinity
                      : 0,
                    ease: "linear",
                  }}
                >
                  <RefreshCw size={16} />
                </motion.span>

                Sync Now
              </motion.button>
            </div>
          </motion.section>

          {/* CONNECTION STATUS */}

          <motion.section
            variants={
              shouldReduceMotion ? undefined : containerVariants
            }
            initial={shouldReduceMotion ? false : "hidden"}
            animate="visible"
            className="grid grid-cols-1 gap-5 lg:grid-cols-2"
          >
            <motion.div
              variants={
                shouldReduceMotion ? undefined : itemVariants
              }
              whileHover={
                shouldReduceMotion ? undefined : { y: -4 }
              }
              className="rounded-2xl border border-[#17243D]/10 bg-[#FFFAF1] p-5 shadow-sm transition-shadow duration-300 hover:shadow-lg"
            >
              <div className="flex items-center gap-3">
                <motion.div
                  animate={
                    shouldReduceMotion
                      ? undefined
                      : { scale: [1, 1.06, 1] }
                  }
                  transition={{
                    duration: 2.5,
                    repeat: shouldReduceMotion ? 0 : Infinity,
                  }}
                  className="rounded-xl bg-[#F8F1E5] p-3"
                >
                  {isOnline ? (
                    <Wifi
                      size={22}
                      className="text-green-600"
                    />
                  ) : (
                    <WifiOff
                      size={22}
                      className="text-orange-600"
                    />
                  )}
                </motion.div>

                <div>
                  <p className="text-sm font-semibold text-[#17243D]">
                    Internet Connection
                  </p>

                  <p className="mt-1 text-xs text-[#596273]">
                    {isOnline
                      ? "Your device reports an active network connection."
                      : "Your device is currently offline."}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <motion.span
                  key={isOnline ? "online" : "offline"}
                  initial={
                    shouldReduceMotion
                      ? false
                      : { opacity: 0, scale: 0.85 }
                  }
                  animate={{ opacity: 1, scale: 1 }}
                  className={`inline-block rounded-full px-3 py-1.5 text-xs font-bold ${
                    isOnline
                      ? "bg-green-100 text-green-700"
                      : "bg-orange-100 text-orange-700"
                  }`}
                >
                  {isOnline ? "ONLINE" : "OFFLINE"}
                </motion.span>
              </div>
            </motion.div>

            <motion.div
              variants={
                shouldReduceMotion ? undefined : itemVariants
              }
              whileHover={
                shouldReduceMotion ? undefined : { y: -4 }
              }
              className="rounded-2xl border border-[#17243D]/10 bg-[#FFFAF1] p-5 shadow-sm transition-shadow duration-300 hover:shadow-lg"
            >
              <div className="flex items-center gap-3">
                <motion.div
                  animate={
                    backendStatus === "checking" && !shouldReduceMotion
                      ? { scale: [1, 1.08, 1] }
                      : undefined
                  }
                  transition={{
                    duration: 1.2,
                    repeat: backendStatus === "checking" && !shouldReduceMotion
                      ? Infinity
                      : 0,
                  }}
                  className="rounded-xl bg-[#F8F1E5] p-3"
                >
                  {backendReachable ? (
                    <Cloud
                      size={22}
                      className="text-green-600"
                    />
                  ) : (
                    <CloudOff
                      size={22}
                      className="text-orange-600"
                    />
                  )}
                </motion.div>

                <div>
                  <p className="text-sm font-semibold text-[#17243D]">
                    Backend Connection
                  </p>

                  <p className="mt-1 text-xs text-[#596273]">
                    Checks the Mind Vault health endpoint.
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <motion.span
                  key={backendStatus}
                  initial={
                    shouldReduceMotion
                      ? false
                      : { opacity: 0, scale: 0.85 }
                  }
                  animate={{ opacity: 1, scale: 1 }}
                  className={`inline-block rounded-full px-3 py-1.5 text-xs font-bold ${
                    backendReachable
                      ? "bg-green-100 text-green-700"
                      : backendStatus === "checking"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-orange-100 text-orange-700"
                  }`}
                >
                  {backendStatus === "reachable"
                    ? "CONNECTED"
                    : backendStatus === "checking"
                      ? "CHECKING"
                      : backendStatus === "offline"
                        ? "OFFLINE"
                        : "UNAVAILABLE"}
                </motion.span>
              </div>
            </motion.div>
          </motion.section>

          {/* SYNC STATUS */}

          <motion.section
            variants={
              shouldReduceMotion ? undefined : itemVariants
            }
            initial={shouldReduceMotion ? false : "hidden"}
            animate="visible"
            className="rounded-2xl border border-[#17243D]/10 bg-[#FFFAF1] p-6 shadow-sm"
          >
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-semibold text-[#596273]">
                  Current Synchronization Status
                </p>

                <div className="mt-3 flex items-center gap-3">
                  <motion.div
                    key={syncStatus}
                    initial={
                      shouldReduceMotion
                        ? false
                        : { opacity: 0, scale: 0.7 }
                    }
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25 }}
                  >
                    {syncStatus === "syncing" ? (
                      <motion.div
                        animate={
                          shouldReduceMotion
                            ? undefined
                            : { rotate: 360 }
                        }
                        transition={{
                          duration: 1,
                          repeat: shouldReduceMotion ? 0 : Infinity,
                          ease: "linear",
                        }}
                      >
                        <Loader2
                          size={24}
                          className="text-blue-600"
                        />
                      </motion.div>
                    ) : syncStatus === "error" ? (
                      <AlertCircle
                        size={24}
                        className="text-red-600"
                      />
                    ) : syncStatus === "synced" ? (
                      <CheckCircle2
                        size={24}
                        className="text-green-600"
                      />
                    ) : (
                      <Activity
                        size={24}
                        className="text-[#F47768]"
                      />
                    )}
                  </motion.div>

                  <motion.h2
                    key={currentStatus.label}
                    initial={
                      shouldReduceMotion
                        ? false
                        : { opacity: 0, y: 6 }
                    }
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xl font-bold text-[#17243D]"
                  >
                    {currentStatus.label}
                  </motion.h2>
                </div>
              </div>

              <motion.span
                key={syncStatus}
                initial={
                  shouldReduceMotion
                    ? false
                    : { opacity: 0, scale: 0.85 }
                }
                animate={{ opacity: 1, scale: 1 }}
                className={`w-fit rounded-full px-4 py-2 text-xs font-bold ${currentStatus.color}`}
              >
                {syncStatus.toUpperCase()}
              </motion.span>
            </div>

            <div className="mt-6 flex items-start gap-3 border-t border-[#17243D]/10 pt-5">
              <Clock
                size={19}
                className="mt-0.5 shrink-0 text-[#596273]"
              />

              <div>
                <p className="text-xs font-semibold text-[#596273]">
                  Last Successful Synchronization
                </p>

                <motion.p
                  key={lastSyncedAt ?? lastSuccessfulSync ?? "none"}
                  initial={
                    shouldReduceMotion
                      ? false
                      : { opacity: 0, y: 5 }
                  }
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-1 text-sm font-semibold text-[#17243D]"
                >
                  {formatDate(lastSyncedAt ?? lastSuccessfulSync)}
                </motion.p>
              </div>
            </div>

            <AnimatePresence>
              {syncError && (
                <motion.div
                  initial={
                    shouldReduceMotion
                      ? false
                      : { opacity: 0, y: -8 }
                  }
                  animate={{ opacity: 1, y: 0 }}
                  exit={
                    shouldReduceMotion
                      ? undefined
                      : { opacity: 0, y: -8 }
                  }
                  className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4"
                >
                  <div className="flex items-start gap-2 text-red-700">
                    <AlertTriangle
                      size={18}
                      className="mt-0.5 shrink-0"
                    />

                    <div>
                      <p className="text-sm font-bold">
                        Synchronization Error
                      </p>

                      <p className="mt-1 text-sm leading-6">
                        {syncError}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>

          {/* DIAGNOSTIC COUNTERS */}

          <section>
            <motion.div
              variants={
                shouldReduceMotion ? undefined : itemVariants
              }
              initial={shouldReduceMotion ? false : "hidden"}
              animate="visible"
              className="mb-5 flex items-center gap-3"
            >
              <motion.div
                animate={
                  shouldReduceMotion
                    ? undefined
                    : { rotate: [0, 8, -8, 0] }
                }
                transition={{
                  duration: 3,
                  repeat: shouldReduceMotion ? 0 : Infinity,
                  repeatDelay: 2,
                }}
              >
                <Database
                  size={20}
                  className="text-[#F47768]"
                />
              </motion.div>

              <h2 className="text-xl font-bold text-[#17243D]">
                Local Synchronization Queue
              </h2>
            </motion.div>

            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="queue-loading"
                  initial={
                    shouldReduceMotion ? false : { opacity: 0 }
                  }
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex min-h-48 items-center justify-center"
                >
                  <motion.div
                    animate={
                      shouldReduceMotion
                        ? undefined
                        : { rotate: 360 }
                    }
                    transition={{
                      duration: 1,
                      repeat: shouldReduceMotion ? 0 : Infinity,
                      ease: "linear",
                    }}
                  >
                    <Loader2
                      size={30}
                      className="text-[#F47768]"
                    />
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  key="queue-cards"
                  variants={
                    shouldReduceMotion
                      ? undefined
                      : containerVariants
                  }
                  initial={
                    shouldReduceMotion ? false : "hidden"
                  }
                  animate="visible"
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4"
                >
                  <DiagnosticCard
                    title="Pending Changes"
                    value={diagnostics.pending}
                    description="Changes waiting to be uploaded to the server."
                    icon={UploadCloud}
                    accent="bg-blue-100 text-blue-700"
                  />

                  <DiagnosticCard
                    title="Processing"
                    value={diagnostics.processing}
                    description="Changes currently being handled by synchronization."
                    icon={RefreshCw}
                    accent="bg-purple-100 text-purple-700"
                  />

                  <DiagnosticCard
                    title="Failed Changes"
                    value={diagnostics.failed}
                    description="Changes that need another synchronization attempt."
                    icon={AlertCircle}
                    accent="bg-red-100 text-red-700"
                  />

                  <DiagnosticCard
                    title="Unresolved Conflicts"
                    value={diagnostics.conflicts}
                    description="Changes requiring your decision before resolution."
                    icon={AlertTriangle}
                    accent="bg-orange-100 text-orange-700"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <motion.p
              key={diagnostics.totalQueued}
              initial={
                shouldReduceMotion
                  ? false
                  : { opacity: 0, y: 5 }
              }
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 text-xs text-[#596273]"
            >
              Total queued operations: {diagnostics.totalQueued}
            </motion.p>
          </section>

          {/* ERROR */}

          <AnimatePresence>
            {error && (
              <motion.div
                initial={
                  shouldReduceMotion
                    ? false
                    : { opacity: 0, y: -8 }
                }
                animate={{ opacity: 1, y: 0 }}
                exit={
                  shouldReduceMotion
                    ? undefined
                    : { opacity: 0, y: -8 }
                }
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* CONFLICT CENTER */}

          <motion.section
            variants={
              shouldReduceMotion ? undefined : itemVariants
            }
            initial={shouldReduceMotion ? false : "hidden"}
            animate="visible"
            whileHover={
              shouldReduceMotion ? undefined : { y: -3 }
            }
            className="rounded-2xl border border-[#F47768]/20 bg-[#F47768]/10 p-6"
          >
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-bold text-[#17243D]">
                  Need to resolve conflicts?
                </h3>

                <p className="mt-2 max-w-xl text-sm leading-6 text-gray-600">
                  Review differences between your local data
                  and server data. Choose which version to preserve.
                </p>
              </div>

              <motion.button
                whileHover={
                  shouldReduceMotion
                    ? undefined
                    : { y: -2, scale: 1.02 }
                }
                whileTap={
                  shouldReduceMotion
                    ? undefined
                    : { scale: 0.97 }
                }
                onClick={() => navigate("/conflicts")}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#17243D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#263958]"
              >
                Open Conflict Center

                <motion.span
                  animate={
                    shouldReduceMotion
                      ? undefined
                      : { x: [0, 4, 0] }
                  }
                  transition={{
                    duration: 1.5,
                    repeat: shouldReduceMotion ? 0 : Infinity,
                    repeatDelay: 1,
                  }}
                >
                  <ArrowRight size={16} />
                </motion.span>
              </motion.button>
            </div>
          </motion.section>

          {/* FOOTER */}

          <motion.footer
            initial={
              shouldReduceMotion ? false : { opacity: 0 }
            }
            animate={{ opacity: 1 }}
            className="border-t border-[#17243D]/10 pt-5 text-center text-xs text-[#596273]"
          >
            Mind Vault | Your Knowledge. Your Memory. Always Available.
          </motion.footer>
        </motion.div>
      </main>
    </div>
  );
}

export default SyncDiagnosticsPage;
