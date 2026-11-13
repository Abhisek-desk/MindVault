import { useCallback, useEffect, useState } from "react";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react";

import {
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  FileText,
  Folder,
  Cloud,
  Laptop,
  ArrowLeftRight,
  Loader2,
} from "lucide-react";

import Sidebar from "../../dashboard/components/Sidebar";
import DashboardHeader from "../../dashboard/components/DashboardHeader";

import {
  getLocalConflicts,
  keepLocalVersion,
  useServerVersion as applyServerVersion,
} from "../../../db/conflict.db";

import type { LocalConflict } from "../../../db/database";

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
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

function ConflictsPage() {
  const shouldReduceMotion = useReducedMotion();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [conflicts, setConflicts] = useState<LocalConflict[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  // =====================================
  // LOAD CONFLICTS
  // =====================================

  const loadConflicts = useCallback(async () => {
    try {
      setError("");

      const result = await getLocalConflicts();

      setConflicts(result);
    } catch {
      setError("Unable to load synchronization conflicts.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // =====================================
  // INITIAL CONFLICT LOADING
  // =====================================

  useEffect(() => {
    let cancelled = false;

    const loadInitialConflicts = async () => {
      try {
        const result = await getLocalConflicts();

        if (!cancelled) {
          setConflicts(result);
        }
      } catch {
        if (!cancelled) {
          setError("Unable to load synchronization conflicts.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadInitialConflicts();

    return () => {
      cancelled = true;
    };
  }, []);

  // =====================================
  // KEEP LOCAL VERSION
  // =====================================

  const handleKeepLocal = async (conflict: LocalConflict) => {
    const confirmed = window.confirm(
      "Keep your local version? It will be queued to synchronize with the server.",
    );

    if (!confirmed) return;

    try {
      setResolvingId(conflict.id);
      setError("");

      await keepLocalVersion(conflict.id);

      await loadConflicts();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to keep the local version.",
      );
    } finally {
      setResolvingId(null);
    }
  };

  // =====================================
  // USE SERVER VERSION
  // =====================================

  const handleUseServer = async (conflict: LocalConflict) => {
    const confirmed = window.confirm(
      "Use the server version? Your conflicting local changes will be discarded.",
    );

    if (!confirmed) return;

    try {
      setResolvingId(conflict.id);
      setError("");

      await applyServerVersion(conflict.id);

      await loadConflicts();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to restore the server version.",
      );
    } finally {
      setResolvingId(null);
    }
  };

  // =====================================
  // FORMAT DATE
  // =====================================

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  // =====================================
  // GET ENTITY NAME
  // =====================================

  const getEntityName = (conflict: LocalConflict) => {
    if (conflict.localData) {
      const data = conflict.localData;

      if (typeof data.title === "string") {
        return data.title;
      }

      if (typeof data.name === "string") {
        return data.name;
      }
    }

    if (conflict.serverData) {
      const data = conflict.serverData;

      if (typeof data.title === "string") {
        return data.title;
      }

      if (typeof data.name === "string") {
        return data.name;
      }
    }

    return conflict.entityType === "note"
      ? "Untitled note"
      : "Untitled folder";
  };

  // =====================================
  // GET OPERATION LABEL
  // =====================================

  const getOperationLabel = (
    operation: LocalConflict["operation"],
  ) => {
    switch (operation) {
      case "create":
        return "Created";

      case "update":
        return "Updated";

      case "delete":
        return "Deleted";

      default:
        return operation;
    }
  };

  // =====================================
  // RENDER LOCAL / SERVER VERSION
  // =====================================

  const renderVersion = (
    title: string,
    data: Record<string, unknown> | null,
    icon: "local" | "server",
  ) => {
    const Icon = icon === "local" ? Laptop : Cloud;

    return (
      <motion.div
        variants={shouldReduceMotion ? undefined : itemVariants}
        whileHover={
          shouldReduceMotion ? undefined : { y: -3 }
        }
        className="min-w-0 rounded-2xl border border-[#17243D]/10 bg-white p-5"
      >
        <div className="mb-4 flex items-center gap-2">
          <motion.div
            whileHover={
              shouldReduceMotion
                ? undefined
                : { rotate: 8, scale: 1.08 }
            }
            className="rounded-lg bg-[#F8F1E5] p-2 text-[#17243D]"
          >
            <Icon size={18} />
          </motion.div>

          <h4 className="font-semibold text-[#17243D]">
            {title}
          </h4>
        </div>

        {!data ? (
          <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
            This version represents a deleted item.
          </div>
        ) : (
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-[#F8F1E5]/70 p-4 text-xs leading-6 text-gray-700">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </motion.div>
    );
  };

  // =====================================
  // PAGE LAYOUT
  // =====================================

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
          className="mx-auto max-w-[1600px] space-y-8 p-5 md:p-8"
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
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[#F47768]">
                <ArrowLeftRight size={17} />
                Synchronization Center
              </div>

              <h1 className="text-3xl font-bold text-[#17243D]">
                Resolve Conflicts
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                Sometimes your device and the server contain different
                versions of the same item. Review both versions and
                choose which one to keep.
              </p>
            </div>

            <motion.button
              whileHover={
                shouldReduceMotion ? undefined : { y: -2 }
              }
              whileTap={
                shouldReduceMotion ? undefined : { scale: 0.96 }
              }
              onClick={() => {
                setIsLoading(true);
                void loadConflicts();
              }}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 rounded-xl border border-[#17243D]/10 bg-white px-5 py-3 text-sm font-semibold text-[#17243D] transition hover:bg-[#FFFAF1] disabled:opacity-50"
            >
              <motion.span
                animate={
                  isLoading && !shouldReduceMotion
                    ? { rotate: 360 }
                    : undefined
                }
                transition={{
                  duration: 1,
                  repeat: isLoading && !shouldReduceMotion ? Infinity : 0,
                  ease: "linear",
                }}
              >
                <RefreshCw size={16} />
              </motion.span>

              Refresh
            </motion.button>
          </motion.section>

          {/* SUMMARY */}

          <motion.section
            variants={
              shouldReduceMotion ? undefined : itemVariants
            }
            initial={shouldReduceMotion ? false : "hidden"}
            animate="visible"
            className="rounded-2xl border border-[#F47768]/20 bg-[#F47768]/10 p-5"
          >
            <div className="flex items-start gap-4">
              <motion.div
                animate={
                  shouldReduceMotion
                    ? undefined
                    : { rotate: [0, -5, 5, 0] }
                }
                transition={{
                  duration: 3,
                  repeat: shouldReduceMotion ? 0 : Infinity,
                  repeatDelay: 3,
                }}
                className="rounded-xl bg-white p-3 text-[#F47768]"
              >
                <AlertTriangle size={23} />
              </motion.div>

              <div>
                <motion.h3
                  key={conflicts.length}
                  initial={
                    shouldReduceMotion
                      ? false
                      : { opacity: 0, y: 6 }
                  }
                  animate={{ opacity: 1, y: 0 }}
                  className="font-bold text-[#17243D]"
                >
                  {conflicts.length} unresolved{" "}
                  {conflicts.length === 1
                    ? "conflict"
                    : "conflicts"}
                </motion.h3>

                <p className="mt-1 text-sm leading-6 text-gray-600">
                  Review each conflict carefully. Choosing one version
                  determines which data will be preserved.
                </p>
              </div>
            </div>
          </motion.section>

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

          {/* LOADING / EMPTY STATE / CONFLICT LIST */}

          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={
                  shouldReduceMotion ? false : { opacity: 0 }
                }
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex min-h-64 items-center justify-center"
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
            ) : conflicts.length === 0 ? (
              <motion.div
                key="empty"
                initial={
                  shouldReduceMotion
                    ? false
                    : { opacity: 0, y: 15, scale: 0.98 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
                className="rounded-3xl border border-[#17243D]/10 bg-[#FFFAF1] px-6 py-16 text-center"
              >
                <motion.div
                  animate={
                    shouldReduceMotion
                      ? undefined
                      : { scale: [1, 1.08, 1] }
                  }
                  transition={{
                    duration: 2.5,
                    repeat: shouldReduceMotion ? 0 : Infinity,
                  }}
                  className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600"
                >
                  <CheckCircle2 size={38} />
                </motion.div>

                <h2 className="text-2xl font-bold text-[#17243D]">
                  Everything is in sync!
                </h2>

                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500">
                  There are no unresolved conflicts. Your local knowledge
                  is ready to continue synchronizing.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="conflict-list"
                variants={
                  shouldReduceMotion ? undefined : containerVariants
                }
                initial={
                  shouldReduceMotion ? false : "hidden"
                }
                animate="visible"
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {conflicts.map((conflict) => {
                  const isResolving =
                    resolvingId === conflict.id;

                  return (
                    <motion.article
                      key={conflict.id}
                      variants={
                        shouldReduceMotion
                          ? undefined
                          : itemVariants
                      }
                      layout={!shouldReduceMotion}
                      className="overflow-hidden rounded-2xl border border-[#17243D]/10 bg-[#FFFAF1] shadow-sm transition-shadow duration-300 hover:shadow-lg"
                    >
                      {/* CONFLICT TITLE */}

                      <div className="flex flex-col justify-between gap-4 border-b border-[#17243D]/10 p-5 sm:flex-row sm:items-center">
                        <div className="flex min-w-0 items-center gap-3">
                          <motion.div
                            whileHover={
                              shouldReduceMotion
                                ? undefined
                                : { scale: 1.08, rotate: 5 }
                            }
                            className="rounded-xl bg-[#F8F1E5] p-3 text-[#17243D]"
                          >
                            {conflict.entityType === "note" ? (
                              <FileText size={21} />
                            ) : (
                              <Folder size={21} />
                            )}
                          </motion.div>

                          <div className="min-w-0">
                            <h3 className="truncate font-bold text-[#17243D]">
                              {getEntityName(conflict)}
                            </h3>

                            <p className="mt-1 text-xs text-gray-500">
                              {conflict.entityType.toUpperCase()} Â·{" "}
                              {getOperationLabel(conflict.operation)} on server
                            </p>
                          </div>
                        </div>

                        <motion.span
                          initial={
                            shouldReduceMotion
                              ? false
                              : { opacity: 0, scale: 0.85 }
                          }
                          animate={{ opacity: 1, scale: 1 }}
                          className="w-fit rounded-full bg-[#F47768]/15 px-3 py-1.5 text-xs font-bold text-[#D95F51]"
                        >
                          Conflict detected
                        </motion.span>
                      </div>

                      {/* CONFLICT DETAILS */}

                      <div className="space-y-5 p-5">
                        <p className="text-xs text-gray-500">
                          Detected: {formatDate(conflict.detectedAt)}
                        </p>

                        <motion.div
                          variants={
                            shouldReduceMotion
                              ? undefined
                              : containerVariants
                          }
                          initial={
                            shouldReduceMotion ? false : "hidden"
                          }
                          animate="visible"
                          className="grid grid-cols-1 gap-4 lg:grid-cols-2"
                        >
                          {renderVersion(
                            "Your Local Version",
                            conflict.localData,
                            "local",
                          )}

                          {renderVersion(
                            "Server Version",
                            conflict.serverData,
                            "server",
                          )}
                        </motion.div>

                        {/* RESOLUTION BUTTONS */}

                        <div className="flex flex-col justify-end gap-3 border-t border-[#17243D]/10 pt-5 sm:flex-row">
                          <motion.button
                            whileHover={
                              shouldReduceMotion
                                ? undefined
                                : { y: -2, scale: 1.01 }
                            }
                            whileTap={
                              shouldReduceMotion
                                ? undefined
                                : { scale: 0.97 }
                            }
                            onClick={() =>
                              void handleKeepLocal(conflict)
                            }
                            disabled={
                              isResolving || resolvingId !== null
                            }
                            className="flex items-center justify-center gap-2 rounded-xl border border-[#17243D]/15 bg-white px-5 py-3 text-sm font-semibold text-[#17243D] transition hover:border-[#F47768] hover:bg-[#F8F1E5] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isResolving ? (
                              <Loader2
                                size={16}
                                className="animate-spin"
                              />
                            ) : (
                              <Laptop size={17} />
                            )}

                            Keep My Version
                          </motion.button>

                          <motion.button
                            whileHover={
                              shouldReduceMotion
                                ? undefined
                                : { y: -2, scale: 1.01 }
                            }
                            whileTap={
                              shouldReduceMotion
                                ? undefined
                                : { scale: 0.97 }
                            }
                            onClick={() =>
                              void handleUseServer(conflict)
                            }
                            disabled={
                              isResolving || resolvingId !== null
                            }
                            className="flex items-center justify-center gap-2 rounded-xl bg-[#17243D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#263958] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isResolving ? (
                              <Loader2
                                size={16}
                                className="animate-spin"
                              />
                            ) : (
                              <Cloud size={17} />
                            )}

                            Use Server Version
                          </motion.button>
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.footer
            initial={
              shouldReduceMotion ? false : { opacity: 0 }
            }
            animate={{ opacity: 1 }}
            className="border-t border-[#17243D]/10 pt-5 text-center text-xs text-gray-400"
          >
            Mind Vault Â· Your Knowledge. Your Memory. Always Available.
          </motion.footer>
        </motion.div>
      </main>
    </div>
  );
}

export default ConflictsPage;