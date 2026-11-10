import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { FileText, ArrowRight, Clock, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { db } from "../../../db/database";
import type { LocalNote } from "../../../db/database";

function RecentNotes() {
  const navigate = useNavigate();

  const [recentNotes, setRecentNotes] = useState<LocalNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadRecentNotes = async () => {
      try {
        const notes = await db.notes
          .orderBy("updatedAt")
          .reverse()
          .limit(5)
          .toArray();

        if (mounted) {
          setRecentNotes(notes);
        }
      } catch {
        if (import.meta.env.DEV) {
          console.error("Failed to load recent notes.");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadRecentNotes();

    return () => {
      mounted = false;
    };
  }, []);

  const formatDate = (date: string) => {
    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Date unavailable";
    }

    return parsedDate.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <section className="rounded-2xl border border-[#17243D]/5 bg-[#FFFAF1] p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#17243D]">Recent Notes</h2>

          <p className="mt-1 text-sm text-gray-500">
            Continue where you left off.
          </p>
        </div>

        <button
          onClick={() => navigate("/notes")}
          className="flex items-center gap-2 text-sm font-semibold text-[#B83E32] transition hover:text-[#17243D]"
        >
          View all
          <ArrowRight size={17} />
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-[#596273]">
          Loading your notes...
        </div>
      ) : recentNotes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#17243D]/15 py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F47768]/10 text-[#F47768]">
            <FileText size={26} />
          </div>

          <h3 className="mt-4 font-semibold text-[#17243D]">No notes yet</h3>

          <p className="mt-2 text-sm text-gray-500">
            Start capturing your ideas and knowledge.
          </p>

          <button
            onClick={() => navigate("/notes")}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#B83E32] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#962F27]"
          >
            <Plus size={17} />
            Create Your First Note
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {recentNotes.map((note, index) => (
            <motion.button
              key={note.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => navigate("/notes")}
              className="flex w-full items-start gap-4 rounded-xl border border-[#17243D]/5 p-4 text-left transition hover:border-[#F47768]/30 hover:bg-[#F8F1E5]/60"
            >
              <div className="rounded-xl bg-[#F47768]/10 p-3 text-[#F47768]">
                <FileText size={21} />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-[#17243D]">
                  {note.title || "Untitled Note"}
                </h3>

                <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-500">
                  {note.content || "No content available."}
                </p>

                <div className="mt-3 flex items-center gap-2 text-xs text-[#596273]">
                  <Clock size={13} />
                  Updated {formatDate(note.updatedAt)}
                </div>
              </div>

              <ArrowRight size={18} className="mt-2 shrink-0 text-[#596273]" />
            </motion.button>
          ))}
        </div>
      )}

      <button
        onClick={() => navigate("/notes")}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#17243D]/20 py-3 text-sm font-semibold text-[#17243D] transition hover:border-[#F47768] hover:bg-[#F47768]/5"
      >
        <Plus size={17} />
        Create a Note
      </button>
    </section>
  );
}

export default RecentNotes;
