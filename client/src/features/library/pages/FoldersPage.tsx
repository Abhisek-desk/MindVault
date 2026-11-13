import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Folder,
  Plus,
  Search,
  Pencil,
  Trash2,
  FileText,
  X,
  FolderOpen,
} from "lucide-react";

import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Variants,
} from "motion/react";

import Sidebar from "../../dashboard/components/Sidebar";
import DashboardHeader from "../../dashboard/components/DashboardHeader";

import {
  createLocalFolder,
  updateLocalFolder,
  deleteLocalFolderAndUnassignNotes,
} from "../../../db/folder.db";

import { db, withDatabaseLease, type LocalFolder } from "../../../db/database";

const folderColors = [
  "#F47768",
  "#E9A23B",
  "#4C9F70",
  "#5486D8",
  "#9673C8",
  "#D66BA0",
];

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.09,
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

function FoldersPage() {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const [folders, setFolders] = useState<LocalFolder[]>([]);
  const [noteCounts, setNoteCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [editingFolder, setEditingFolder] = useState<LocalFolder | null>(null);

  const [folderName, setFolderName] = useState("");
  const [folderColor, setFolderColor] = useState(folderColors[0]);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const activeContainerVariants = shouldReduceMotion
    ? undefined
    : containerVariants;

  const activeItemVariants = shouldReduceMotion ? undefined : itemVariants;

  // =====================================
  // LOAD FOLDERS AND NOTE COUNTS
  // =====================================

  const loadFolders = useCallback(async () => {
    try {
      const [localFolders, notes] = await withDatabaseLease(() =>
        Promise.all([db.folders.toArray(), db.notes.toArray()]),
      );

      setFolders(localFolders);

      const counts: Record<string, number> = {};

      notes.forEach((note) => {
        if (note.folderId) {
          counts[note.folderId] = (counts[note.folderId] || 0) + 1;
        }
      });

      setNoteCounts(counts);
    } catch {
      setError("Unable to load folders.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadInitialFolders = async () => {
      try {
        const [localFolders, notes] = await withDatabaseLease(() =>
          Promise.all([db.folders.toArray(), db.notes.toArray()]),
        );

        if (cancelled) return;

        setFolders(localFolders);

        const counts: Record<string, number> = {};

        notes.forEach((note) => {
          if (note.folderId) {
            counts[note.folderId] = (counts[note.folderId] || 0) + 1;
          }
        });

        setNoteCounts(counts);
      } catch {
        if (!cancelled) {
          setError("Unable to load folders.");
        }
      }
    };

    void loadInitialFolders();

    return () => {
      cancelled = true;
    };
  }, []);

  // =====================================
  // FILTER FOLDERS
  // =====================================

  const filteredFolders = useMemo(() => {
    return folders.filter((folder) =>
      folder.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [folders, search]);

  // =====================================
  // OPEN CREATE MODAL
  // =====================================

  const openCreateModal = () => {
    setEditingFolder(null);
    setFolderName("");
    setFolderColor(folderColors[0]);
    setError("");
    setIsModalOpen(true);
  };

  // =====================================
  // OPEN EDIT MODAL
  // =====================================

  const openEditModal = (folder: LocalFolder) => {
    setEditingFolder(folder);
    setFolderName(folder.name);
    setFolderColor(folder.color);
    setError("");
    setIsModalOpen(true);
  };

  // =====================================
  // ADD NOTE TO SELECTED FOLDER
  // =====================================

  const handleAddNote = (folder: LocalFolder) => {
    navigate(`/notes?folderId=${encodeURIComponent(folder.id)}`);
  };

  // =====================================
  // SAVE FOLDER
  // =====================================

  const handleSaveFolder = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!folderName.trim()) {
      setError("Please enter a folder name.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      if (editingFolder) {
        await updateLocalFolder(editingFolder.id, {
          name: folderName,
          color: folderColor,
        });
      } else {
        await createLocalFolder(folderName, folderColor);
      }

      setIsModalOpen(false);
      await loadFolders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save folder.");
    } finally {
      setIsSaving(false);
    }
  };

  // =====================================
  // DELETE FOLDER
  // =====================================

  const handleDeleteFolder = async (folder: LocalFolder) => {
    const count = noteCounts[folder.id] || 0;

    const message =
      count > 0
        ? `Delete "${folder.name}"? Its ${count} note(s) will be moved to unfiled notes.`
        : `Delete "${folder.name}"?`;

    if (!window.confirm(message)) {
      return;
    }

    try {
      await deleteLocalFolderAndUnassignNotes(folder.id);
      await loadFolders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete folder.");
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F8F1E5]">
      {/* SIDEBAR */}

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* MAIN CONTENT */}

      <main className="min-w-0 flex-1">
        <DashboardHeader onMenuClick={() => setIsSidebarOpen(true)} />

        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
          className="mx-auto max-w-7xl px-5 py-8 md:px-8"
        >
          {/* PAGE HEADING */}

          <motion.div
            variants={activeItemVariants}
            initial={shouldReduceMotion ? false : "hidden"}
            animate="visible"
            className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center"
          >
            <div>
              <p className="mb-2 text-sm font-medium text-[#F47768]">
                ORGANIZE YOUR KNOWLEDGE
              </p>

              <h1 className="text-3xl font-bold text-[#17243D]">My Folders</h1>

              <p className="mt-2 text-sm text-gray-500">
                Organize your notes into meaningful collections.
              </p>
            </div>

            <motion.button
              whileHover={shouldReduceMotion ? undefined : { scale: 1.04, y: -2 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
              onClick={openCreateModal}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#F47768] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#F47768]/20 transition hover:bg-[#e96859]"
            >
              <Plus size={19} />
              Create Folder
            </motion.button>
          </motion.div>

          {/* ERROR MESSAGE */}

          <AnimatePresence>
            {error && !isModalOpen && (
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8 }}
                className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* SEARCH AND STATS */}

          <motion.div
            variants={activeItemVariants}
            initial={shouldReduceMotion ? false : "hidden"}
            animate="visible"
            className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="relative max-w-md flex-1">
              <Search
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search folders..."
                className="w-full rounded-xl border border-[#17243D]/10 bg-[#FFFAF1] py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#F47768] focus:ring-2 focus:ring-[#F47768]/10"
              />
            </div>

            <div className="rounded-xl bg-[#FFFAF1] px-5 py-3 text-sm text-gray-600">
              <span className="font-bold text-[#17243D]">{folders.length}</span>{" "}
              {folders.length === 1 ? "Folder" : "Folders"}
            </div>
          </motion.div>

          {/* FOLDER GRID */}

          <AnimatePresence mode="wait">
            {filteredFolders.length > 0 ? (
              <motion.div
                key="folder-grid"
                variants={activeContainerVariants}
                initial={shouldReduceMotion ? false : "hidden"}
                animate="visible"
                exit={shouldReduceMotion ? undefined : { opacity: 0 }}
                className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
              >
                {filteredFolders.map((folder) => {
                  const count = noteCounts[folder.id] || 0;

                  return (
                    <motion.div
                      key={folder.id}
                      variants={activeItemVariants}
                      whileHover={
                        shouldReduceMotion
                          ? undefined
                          : { y: -5, scale: 1.01 }
                      }
                      transition={{ duration: 0.22 }}
                      className="group rounded-2xl border border-[#17243D]/5 bg-[#FFFAF1] p-5 shadow-sm transition-shadow duration-300 hover:shadow-lg"
                    >
                      <div className="flex items-start justify-between">
                        <motion.div
                          whileHover={
                            shouldReduceMotion
                              ? undefined
                              : { rotate: -6, scale: 1.08 }
                          }
                          transition={{ duration: 0.2 }}
                          className="rounded-2xl p-4"
                          style={{
                            backgroundColor: `${folder.color}20`,
                            color: folder.color,
                          }}
                        >
                          <Folder size={27} />
                        </motion.div>

                        <div className="relative flex gap-1">
                          <motion.button
                            whileHover={
                              shouldReduceMotion ? undefined : { scale: 1.12 }
                            }
                            whileTap={
                              shouldReduceMotion ? undefined : { scale: 0.9 }
                            }
                            onClick={() => openEditModal(folder)}
                            title="Edit folder"
                            aria-label={`Edit ${folder.name}`}
                            className="rounded-lg p-2 text-gray-400 transition hover:bg-[#F8F1E5] hover:text-[#17243D]"
                          >
                            <Pencil size={17} />
                          </motion.button>

                          <motion.button
                            whileHover={
                              shouldReduceMotion ? undefined : { scale: 1.12 }
                            }
                            whileTap={
                              shouldReduceMotion ? undefined : { scale: 0.9 }
                            }
                            onClick={() => handleDeleteFolder(folder)}
                            title="Delete folder"
                            aria-label={`Delete ${folder.name}`}
                            className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                          >
                            <Trash2 size={17} />
                          </motion.button>
                        </div>
                      </div>

                      <div className="mt-5">
                        <h3 className="truncate text-lg font-bold text-[#17243D]">
                          {folder.name}
                        </h3>

                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <FileText size={16} />
                            {count} {count === 1 ? "Note" : "Notes"}
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              folder.syncStatus === "synced"
                                ? "bg-green-100 text-green-700"
                                : folder.syncStatus === "conflict"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {folder.syncStatus === "synced"
                              ? "Synced"
                              : folder.syncStatus === "conflict"
                                ? "Conflict"
                                : "Pending sync"}
                          </span>
                        </div>
                      </div>

                      {/* ADD NOTE BUTTON */}

                      <motion.button
                        whileHover={
                          shouldReduceMotion ? undefined : { scale: 1.02 }
                        }
                        whileTap={
                          shouldReduceMotion ? undefined : { scale: 0.98 }
                        }
                        onClick={() => handleAddNote(folder)}
                        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#F47768]/10 px-4 py-3 text-sm font-semibold text-[#B83E32] transition hover:bg-[#F47768] hover:text-white"
                      >
                        <Plus size={17} />
                        Add Note
                      </motion.button>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div
                key="empty-folders"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="rounded-2xl border border-dashed border-[#17243D]/15 bg-[#FFFAF1] px-6 py-20 text-center"
              >
                <motion.div
                  animate={
                    shouldReduceMotion ? undefined : { y: [0, -5, 0] }
                  }
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F47768]/10 text-[#F47768]"
                >
                  {search ? <Search size={30} /> : <FolderOpen size={30} />}
                </motion.div>

                <h3 className="text-xl font-bold text-[#17243D]">
                  {search ? "No folders found" : "No folders yet"}
                </h3>

                <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
                  {search
                    ? "Try searching with another folder name."
                    : "Create your first folder to start organizing your knowledge."}
                </p>

                {!search && (
                  <motion.button
                    whileHover={
                      shouldReduceMotion ? undefined : { scale: 1.04 }
                    }
                    whileTap={
                      shouldReduceMotion ? undefined : { scale: 0.96 }
                    }
                    onClick={openCreateModal}
                    className="mt-6 rounded-xl bg-[#F47768] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e96859]"
                  >
                    Create Your First Folder
                  </motion.button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>

      {/* CREATE / EDIT MODAL */}

      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#17243D]/50 p-4 backdrop-blur-sm"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setIsModalOpen(false);
              }
            }}
          >
            <motion.div
              initial={
                shouldReduceMotion
                  ? false
                  : { opacity: 0, scale: 0.94, y: 20 }
              }
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={
                shouldReduceMotion
                  ? undefined
                  : { opacity: 0, scale: 0.96, y: 12 }
              }
              transition={{
                duration: 0.25,
                ease: [0.22, 1, 0.36, 1],
              }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-[#FFFAF1] p-6 shadow-2xl"
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[#17243D]">
                    {editingFolder ? "Edit Folder" : "Create Folder"}
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Give your folder a name and color.
                  </p>
                </div>

                <motion.button
                  whileHover={
                    shouldReduceMotion ? undefined : { rotate: 90, scale: 1.1 }
                  }
                  whileTap={
                    shouldReduceMotion ? undefined : { scale: 0.9 }
                  }
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-[#F8F1E5] hover:text-[#17243D]"
                  aria-label="Close modal"
                >
                  <X size={21} />
                </motion.button>
              </div>

              <form onSubmit={handleSaveFolder}>
                <label className="mb-2 block text-sm font-semibold text-[#17243D]">
                  Folder Name
                </label>

                <input
                  type="text"
                  autoFocus
                  maxLength={80}
                  value={folderName}
                  onChange={(event) => setFolderName(event.target.value)}
                  placeholder="e.g. Programming, Research..."
                  className="w-full rounded-xl border border-[#17243D]/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#F47768] focus:ring-2 focus:ring-[#F47768]/10"
                />

                <label className="mb-3 mt-6 block text-sm font-semibold text-[#17243D]">
                  Choose Folder Color
                </label>

                <div className="flex flex-wrap gap-3">
                  {folderColors.map((color) => (
                    <motion.button
                      key={color}
                      type="button"
                      whileHover={
                        shouldReduceMotion ? undefined : { scale: 1.15 }
                      }
                      whileTap={
                        shouldReduceMotion ? undefined : { scale: 0.9 }
                      }
                      onClick={() => setFolderColor(color)}
                      className={`h-9 w-9 rounded-full transition ${
                        folderColor === color
                          ? "scale-110 ring-2 ring-[#17243D] ring-offset-2"
                          : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={`Choose ${color}`}
                      aria-pressed={folderColor === color}
                    />
                  ))}
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={
                        shouldReduceMotion ? false : { opacity: 0, y: 6 }
                      }
                      animate={{ opacity: 1, y: 0 }}
                      exit={
                        shouldReduceMotion ? undefined : { opacity: 0 }
                      }
                      className="mt-4 text-sm text-red-500"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <div className="mt-8 flex gap-3">
                  <motion.button
                    whileHover={
                      shouldReduceMotion ? undefined : { scale: 1.02 }
                    }
                    whileTap={
                      shouldReduceMotion ? undefined : { scale: 0.97 }
                    }
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 rounded-xl border border-[#17243D]/10 px-4 py-3 text-sm font-semibold text-[#17243D] transition hover:bg-[#F8F1E5]"
                  >
                    Cancel
                  </motion.button>

                  <motion.button
                    whileHover={
                      shouldReduceMotion ? undefined : { scale: 1.02 }
                    }
                    whileTap={
                      shouldReduceMotion ? undefined : { scale: 0.97 }
                    }
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 rounded-xl bg-[#F47768] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#e96859] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving
                      ? "Saving..."
                      : editingFolder
                        ? "Save Changes"
                        : "Create Folder"}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default FoldersPage;