import { useCallback, useEffect, useState } from "react";

import { motion } from "motion/react";

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
  useServerVersion,
} from "../../../db/conflict.db";

import type { LocalConflict } from "../../../db/database";

function ConflictsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [conflicts, setConflicts] = useState<LocalConflict[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [error, setError] = useState("");

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

  useEffect(() => {
    void loadConflicts();
  }, [loadConflicts]);

  const handleKeepLocal = async (conflict: LocalConflict) => {
    const confirmed = window.confirm(
      "Keep your local version? It will be queued to synchronize with the server."
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
          : "Unable to keep the local version."
      );
    } finally {
      setResolvingId(null);
    }
  };

  const handleUseServer = async (conflict: LocalConflict) => {
    const confirmed = window.confirm(
      "Use the server version? Your conflicting local changes will be discarded."
    );

    if (!confirmed) return;

    try {
      setResolvingId(conflict.id);
      setError("");

      await useServerVersion(conflict.id);

      await loadConflicts();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to restore the server version."
      );
    } finally {
      setResolvingId(null);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

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

  const getOperationLabel = (operation: LocalConflict["operation"]) => {
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

  const renderVersion = (
    title: string,
    data: Record<string, unknown> | null,
    icon: "local" | "server"
  ) => {
    const Icon = icon === "local" ? Laptop : Cloud;

    return (
      <div className="min-w-0 rounded-2xl border border-[#17243D]/10 bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-lg bg-[#F8F1E5] p-2 text-[#17243D]">
            <Icon size={18} />
          </div>

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
      </div>
    );
  };

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
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mx-auto max-w-[1600px] space-y-8 p-5 md:p-8"
        >
          {/* PAGE HEADER */}

          <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
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

            <button
              onClick={() => {
                setIsLoading(true);
                void loadConflicts();
              }}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 rounded-xl border border-[#17243D]/10 bg-white px-5 py-3 text-sm font-semibold text-[#17243D] transition hover:bg-[#FFFAF1] disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={isLoading ? "animate-spin" : ""}
              />

              Refresh
            </button>
          </section>

          {/* SUMMARY */}

          <section className="rounded-2xl border border-[#F47768]/20 bg-[#F47768]/10 p-5">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-white p-3 text-[#F47768]">
                <AlertTriangle size={23} />
              </div>

              <div>
                <h3 className="font-bold text-[#17243D]">
                  {conflicts.length} unresolved{" "}
                  {conflicts.length === 1 ? "conflict" : "conflicts"}
                </h3>

                <p className="mt-1 text-sm leading-6 text-gray-600">
                  Review each conflict carefully. Choosing one version
                  determines which data will be preserved.
                </p>
              </div>
            </div>
          </section>

          {/* ERROR */}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* LOADING */}

          {isLoading ? (
            <div className="flex min-h-64 items-center justify-center">
              <Loader2
                size={30}
                className="animate-spin text-[#F47768]"
              />
            </div>
          ) : conflicts.length === 0 ? (
            /* EMPTY STATE */

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-3xl border border-[#17243D]/10 bg-[#FFFAF1] px-6 py-16 text-center"
            >
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600">
                <CheckCircle2 size={38} />
              </div>

              <h2 className="text-2xl font-bold text-[#17243D]">
                Everything is in sync!
              </h2>

              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500">
                There are no unresolved conflicts. Your local knowledge
                is ready to continue synchronizing.
              </p>
            </motion.div>
          ) : (
            /* CONFLICT LIST */

            <div className="space-y-6">
              {conflicts.map((conflict) => {
                const isResolving = resolvingId === conflict.id;

                return (
                  <motion.article
                    key={conflict.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="overflow-hidden rounded-2xl border border-[#17243D]/10 bg-[#FFFAF1] shadow-sm"
                  >
                    {/* CONFLICT TITLE */}

                    <div className="flex flex-col justify-between gap-4 border-b border-[#17243D]/10 p-5 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="rounded-xl bg-[#F8F1E5] p-3 text-[#17243D]">
                          {conflict.entityType === "note" ? (
                            <FileText size={21} />
                          ) : (
                            <Folder size={21} />
                          )}
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate font-bold text-[#17243D]">
                            {getEntityName(conflict)}
                          </h3>

                          <p className="mt-1 text-xs text-gray-500">
                            {conflict.entityType.toUpperCase()} ·{" "}
                            {getOperationLabel(conflict.operation)} on server
                          </p>
                        </div>
                      </div>

                      <span className="w-fit rounded-full bg-[#F47768]/15 px-3 py-1.5 text-xs font-bold text-[#D95F51]">
                        Conflict detected
                      </span>
                    </div>

                    {/* CONFLICT DETAILS */}

                    <div className="space-y-5 p-5">
                      <p className="text-xs text-gray-500">
                        Detected: {formatDate(conflict.detectedAt)}
                      </p>

                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {renderVersion(
                          "Your Local Version",
                          conflict.localData,
                          "local"
                        )}

                        {renderVersion(
                          "Server Version",
                          conflict.serverData,
                          "server"
                        )}
                      </div>

                      {/* RESOLUTION BUTTONS */}

                      <div className="flex flex-col justify-end gap-3 border-t border-[#17243D]/10 pt-5 sm:flex-row">
                        <button
                          onClick={() => void handleKeepLocal(conflict)}
                          disabled={isResolving || resolvingId !== null}
                          className="flex items-center justify-center gap-2 rounded-xl border border-[#17243D]/15 bg-white px-5 py-3 text-sm font-semibold text-[#17243D] transition hover:border-[#F47768] hover:bg-[#F8F1E5] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isResolving ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Laptop size={17} />
                          )}

                          Keep My Version
                        </button>

                        <button
                          onClick={() => void handleUseServer(conflict)}
                          disabled={isResolving || resolvingId !== null}
                          className="flex items-center justify-center gap-2 rounded-xl bg-[#17243D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#263958] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isResolving ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Cloud size={17} />
                          )}

                          Use Server Version
                        </button>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}

          <footer className="border-t border-[#17243D]/10 pt-5 text-center text-xs text-gray-400">
            Mind Vault · Your Knowledge. Your Memory. Always Available.
          </footer>
        </motion.div>
      </main>
    </div>
  );
}

export default ConflictsPage;