import { useEffect, useMemo, useState } from "react";

import {
  Plus,
  Search,
  FileText,
  Save,
  Trash2,
  Clock,
  Wifi,
  WifiOff,
  ArrowLeft,
  Folder,
} from "lucide-react";

import { useNavigate, useSearchParams } from "react-router-dom";

import {
  motion,
  AnimatePresence,
  useReducedMotion,
  type Variants,
} from "motion/react";

import Sidebar from "../../dashboard/components/Sidebar";
import DashboardHeader from "../../dashboard/components/DashboardHeader";

import {
  createLocalNote,
  getLocalNotes,
  updateLocalNote,
  deleteLocalNote,
} from "../../../db/note.db";

import { getLocalFolderById } from "../../../db/folder.db";

import type { LocalNote, LocalFolder } from "../../../db/database";

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

const sectionVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 18,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const listVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.055,
    },
  },
};

const noteVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 12,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

function NotesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const shouldReduceMotion = useReducedMotion();

  const requestedNoteId = searchParams.get("noteId");
  const requestedFolderId = searchParams.get("folderId");

  const [notes, setNotes] = useState<LocalNote[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [search, setSearch] = useState("");

  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [error, setError] = useState("");

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(
    null,
  );

  const [selectedFolder, setSelectedFolder] =
    useState<LocalFolder | null>(null);

  const isOnline = navigator.onLine;

  const activeContainerVariants = shouldReduceMotion
    ? undefined
    : containerVariants;

  const activeSectionVariants = shouldReduceMotion
    ? undefined
    : sectionVariants;

  // LOAD NOTES
  const loadNotes = async () => {
    const localNotes = await getLocalNotes();
    setNotes(localNotes);
  };

  // INITIALIZE NOTES AND REQUESTED FOLDER/NOTE
  useEffect(() => {
    let cancelled = false;

    const initializeNotes = async () => {
      try {
        const localNotes = await getLocalNotes();

        if (cancelled) return;

        setNotes(localNotes);

        // Existing note navigation takes priority.
        if (requestedNoteId) {
          const requestedNote = localNotes.find(
            (note) => note.id === requestedNoteId,
          );

          if (requestedNote) {
            setSelectedNoteId(requestedNote.id);
            setTitle(requestedNote.title);
            setContent(requestedNote.content);
            setSelectedFolderId(null);
            setSelectedFolder(null);
            setIsCreating(false);
            setError("");
            return;
          }

          setSelectedNoteId(null);
          setIsCreating(false);
          setError("The requested note could not be found.");
          return;
        }

        // Open a new note inside the requested folder.
        if (requestedFolderId) {
          if (!/^[a-fA-F0-9]{24}$/.test(requestedFolderId)) {
            setError("Invalid folder selected.");
            setIsCreating(false);
            return;
          }

          const folder = await getLocalFolderById(requestedFolderId);

          if (cancelled) return;

          if (!folder) {
            setSelectedFolderId(null);
            setSelectedFolder(null);
            setIsCreating(false);
            setError(
              "This folder could not be found. It may have been deleted.",
            );
            return;
          }

          setSelectedNoteId(null);
          setTitle("");
          setContent("");
          setSelectedFolderId(folder.id);
          setSelectedFolder(folder);
          setIsCreating(true);
          setError("");
          return;
        }

        // Normal notes page.
        setSelectedNoteId(null);
        setSelectedFolderId(null);
        setSelectedFolder(null);
        setIsCreating(false);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load your notes.",
          );
        }
      }
    };

    void initializeNotes();

    return () => {
      cancelled = true;
    };
  }, [requestedNoteId, requestedFolderId]);

  // SELECTED NOTE
  const selectedNote = notes.find((note) => note.id === selectedNoteId);

  // SEARCH NOTES
  const filteredNotes = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (!query) return notes;

    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query),
    );
  }, [notes, search]);

  // CREATE NEW NOTE
  const handleNewNote = () => {
    setSelectedNoteId(null);
    setSelectedFolderId(null);
    setSelectedFolder(null);
    setTitle("");
    setContent("");
    setError("");
    setIsCreating(true);
  };

  // OPEN NOTE
  const handleSelectNote = (note: LocalNote) => {
    setSelectedNoteId(note.id);
    setSelectedFolderId(null);
    setSelectedFolder(null);
    setTitle(note.title);
    setContent(note.content);
    setError("");
    setIsCreating(false);
  };

  // SAVE NOTE
  const handleSave = async () => {
    setError("");

    if (!title.trim()) {
      setError("Please enter a note title.");
      return;
    }

    setIsSaving(true);

    try {
      if (selectedNoteId) {
        await updateLocalNote(selectedNoteId, {
          title,
          content,
        });
      } else {
        const newNote = await createLocalNote(
          title,
          content,
          selectedFolderId,
        );

        setSelectedNoteId(newNote.id);
        setIsCreating(false);
      }

      await loadNotes();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save your note.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  // DELETE NOTE
  const handleDelete = async () => {
    if (!selectedNoteId) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this note?",
    );

    if (!confirmed) return;

    try {
      await deleteLocalNote(selectedNoteId);

      setSelectedNoteId(null);
      setTitle("");
      setContent("");
      setIsCreating(false);

      await loadNotes();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to delete this note.",
      );
    }
  };

  // FORMAT DATE
  const formatDate = (date: string) => {
    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Unknown date";
    }

    return parsedDate.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="flex min-h-screen bg-[#F8F1E5]">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="min-w-0 flex-1">
        <DashboardHeader onMenuClick={() => setIsSidebarOpen(true)} />

        <motion.div
          variants={activeContainerVariants}
          initial={shouldReduceMotion ? false : "hidden"}
          animate="visible"
          className="mx-auto max-w-[1600px] p-5 md:p-8"
        >
          {/* PAGE HEADING */}

          <motion.div
            variants={activeSectionVariants}
            className="mb-7 flex flex-wrap items-center justify-between gap-4"
          >
            <div>
              <button
                onClick={() => navigate("/dashboard")}
                className="mb-3 flex items-center gap-2 text-sm text-gray-500 hover:text-[#F47768]"
              >
                <ArrowLeft size={16} />
                Back to Dashboard
              </button>

              <h1 className="text-3xl font-bold text-[#17243D]">My Notes</h1>

              <p className="mt-2 text-sm text-gray-500">
                Capture, organize and manage your knowledge.
              </p>
            </div>

            <motion.button
              whileHover={shouldReduceMotion ? undefined : { scale: 1.04 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
              onClick={handleNewNote}
              className="flex items-center gap-2 rounded-xl bg-[#F47768] px-5 py-3 font-semibold text-white transition hover:bg-[#e86657]"
            >
              <Plus size={19} />
              New Note
            </motion.button>
          </motion.div>

          {/* OFFLINE STATUS */}

          <motion.div
            variants={activeSectionVariants}
            className="mb-6 flex items-center gap-2 text-sm"
          >
            {isOnline ? (
              <>
                <Wifi size={17} className="text-green-600" />

                <span className="text-green-700">
                  Online â€” changes will synchronize when sync runs.
                </span>
              </>
            ) : (
              <>
                <WifiOff size={17} className="text-orange-600" />

                <span className="text-orange-700">
                  Offline â€” your notes are saved locally.
                </span>
              </>
            )}
          </motion.div>

          {/* NOTES WORKSPACE */}

          <motion.div
            variants={activeSectionVariants}
            className="grid min-h-[650px] grid-cols-1 gap-6 lg:grid-cols-3"
          >
            {/* NOTES LIST */}

            <motion.section
              whileHover={shouldReduceMotion ? undefined : { y: -2 }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl border border-[#17243D]/5 bg-[#FFFAF1] p-5 shadow-sm"
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-bold text-[#17243D]">All Notes</h2>

                <span className="rounded-full bg-[#F47768]/10 px-3 py-1 text-xs font-semibold text-[#F47768]">
                  {notes.length} Notes
                </span>
              </div>

              {/* SEARCH */}

              <div className="relative mb-5">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  type="search"
                  placeholder="Search notes..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full rounded-xl border border-[#17243D]/10 bg-[#F8F1E5]/60 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#F47768]"
                />
              </div>

              {/* NOTE ITEMS */}

              <AnimatePresence mode="wait">
                {filteredNotes.length === 0 ? (
                  <motion.div
                    key="empty-notes"
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={shouldReduceMotion ? undefined : { opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="py-12 text-center"
                  >
                    <FileText size={35} className="mx-auto text-gray-300" />

                    <p className="mt-3 text-sm font-medium text-gray-500">
                      {search
                        ? "No matching notes found."
                        : "No notes created yet."}
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="notes-list"
                    variants={shouldReduceMotion ? undefined : listVariants}
                    initial={shouldReduceMotion ? false : "hidden"}
                    animate="visible"
                    className="space-y-3"
                  >
                    {filteredNotes.map((note) => (
                      <motion.button
                        key={note.id}
                        variants={shouldReduceMotion ? undefined : noteVariants}
                        whileHover={
                          shouldReduceMotion
                            ? undefined
                            : { x: 4, scale: 1.01 }
                        }
                        whileTap={
                          shouldReduceMotion ? undefined : { scale: 0.985 }
                        }
                        transition={{ duration: 0.2 }}
                        onClick={() => handleSelectNote(note)}
                        className={`w-full rounded-xl border p-4 text-left transition ${
                          selectedNoteId === note.id
                            ? "border-[#F47768] bg-[#F47768]/5"
                            : "border-[#17243D]/5 hover:border-[#F47768]/40 hover:bg-[#F8F1E5]/60"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-[#F47768]/10 p-2 text-[#F47768]">
                            <FileText size={19} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-sm font-semibold text-[#17243D]">
                              {note.title}
                            </h3>

                            <p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-500">
                              {note.content || "No content"}
                            </p>

                            <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                              <Clock size={12} />

                              {formatDate(note.updatedAt)}
                            </div>

                            <p className="mt-2 text-xs">
                              {note.syncStatus === "synced" ? (
                                <span className="text-green-600">Synced</span>
                              ) : note.syncStatus === "conflict" ? (
                                <span className="text-red-600">Conflict</span>
                              ) : (
                                <span className="text-orange-600">
                                  Pending sync
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>

            {/* NOTE EDITOR */}

            <motion.section
              whileHover={shouldReduceMotion ? undefined : { y: -2 }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl border border-[#17243D]/5 bg-[#FFFAF1] p-5 shadow-sm lg:col-span-2"
            >
              <AnimatePresence mode="wait">
                {!selectedNote && !isCreating ? (
                  <motion.div
                    key="editor-empty"
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="flex h-full min-h-[500px] flex-col items-center justify-center text-center"
                  >
                    <motion.div
                      animate={
                        shouldReduceMotion
                          ? undefined
                          : { y: [0, -5, 0] }
                      }
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="rounded-2xl bg-[#F47768]/10 p-5 text-[#F47768]"
                    >
                      <FileText size={35} />
                    </motion.div>

                    <h2 className="mt-5 text-xl font-bold text-[#17243D]">
                      Your Knowledge Workspace
                    </h2>

                    <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500">
                      Select a note from the left or create a new note to start
                      writing.
                    </p>

                    <motion.button
                      whileHover={
                        shouldReduceMotion ? undefined : { scale: 1.04 }
                      }
                      whileTap={
                        shouldReduceMotion ? undefined : { scale: 0.96 }
                      }
                      onClick={handleNewNote}
                      className="mt-6 flex items-center gap-2 rounded-xl bg-[#F47768] px-5 py-3 text-sm font-semibold text-white hover:bg-[#e86657]"
                    >
                      <Plus size={18} />
                      Create a Note
                    </motion.button>
                  </motion.div>
                ) : (
                  <motion.div
                    key={selectedNoteId ?? "new-note"}
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="flex h-full flex-col"
                  >
                    {/* EDITOR HEADER */}

                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#17243D]/10 pb-5">
                      <div>
                        <h2 className="font-bold text-[#17243D]">
                          {isCreating ? "Create New Note" : "Edit Note"}
                        </h2>

                        <p className="mt-1 text-xs text-gray-400">
                          Your changes are saved to this device.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {selectedNoteId && (
                          <motion.button
                            whileHover={
                              shouldReduceMotion ? undefined : { scale: 1.08 }
                            }
                            whileTap={
                              shouldReduceMotion ? undefined : { scale: 0.94 }
                            }
                            onClick={handleDelete}
                            className="rounded-xl border border-red-200 p-3 text-red-500 transition hover:bg-red-50"
                            title="Delete note"
                          >
                            <Trash2 size={18} />
                          </motion.button>
                        )}

                        <motion.button
                          whileHover={
                            shouldReduceMotion ? undefined : { scale: 1.04 }
                          }
                          whileTap={
                            shouldReduceMotion ? undefined : { scale: 0.96 }
                          }
                          onClick={handleSave}
                          disabled={isSaving}
                          className="flex items-center gap-2 rounded-xl bg-[#17243D] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#253858] disabled:opacity-50"
                        >
                          <Save size={17} />

                          {isSaving ? "Saving..." : "Save Note"}
                        </motion.button>
                      </div>
                    </div>

                    {/* FOLDER CONTEXT */}

                    <AnimatePresence>
                      {selectedFolder && isCreating && (
                        <motion.div
                          initial={
                            shouldReduceMotion ? false : { opacity: 0, y: -8 }
                          }
                          animate={{ opacity: 1, y: 0 }}
                          exit={
                            shouldReduceMotion
                              ? undefined
                              : { opacity: 0, y: -8 }
                          }
                          transition={{ duration: 0.2 }}
                          className="mb-5 flex items-center gap-2 rounded-xl border border-[#F47768]/20 bg-[#F47768]/5 p-3 text-sm"
                        >
                          <Folder size={17} className="text-[#F47768]" />

                          <span className="text-gray-500">Saving in:</span>

                          <span className="font-semibold text-[#17243D]">
                            {selectedFolder.name}
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* TITLE */}

                    <input
                      type="text"
                      placeholder="Give your note a title..."
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      maxLength={200}
                      className="mb-5 w-full border-none bg-transparent text-2xl font-bold text-[#17243D] outline-none placeholder:text-gray-300"
                    />

                    {/* CONTENT */}

                    <textarea
                      value={content}
                      onChange={(event) => setContent(event.target.value)}
                      placeholder="Start writing your thoughts, ideas and knowledge here..."
                      className="min-h-[350px] w-full flex-1 resize-none border-none bg-transparent text-base leading-8 text-[#17243D] outline-none placeholder:text-gray-400"
                    />

                    {/* ERROR */}

                    <AnimatePresence>
                      {error && (
                        <motion.p
                          initial={
                            shouldReduceMotion ? false : { opacity: 0, y: 8 }
                          }
                          animate={{ opacity: 1, y: 0 }}
                          exit={
                            shouldReduceMotion ? undefined : { opacity: 0, y: -5 }
                          }
                          transition={{ duration: 0.2 }}
                          className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600"
                        >
                          {error}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    {/* FOOTER */}

                    <div className="mt-5 flex items-center justify-between border-t border-[#17243D]/10 pt-4 text-xs text-gray-400">
                      <span>{content.length} characters</span>

                      <span>
                        {selectedNote
                          ? `Last updated: ${formatDate(selectedNote.updatedAt)}`
                          : "New note"}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}

export default NotesPage;