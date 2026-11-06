import { motion } from "motion/react";
import {
  FileText,
  ArrowRight,
  Clock,
  Plus
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const recentNotes = [
  {
    id: 1,
    title: "Introduction to Artificial Intelligence",
    content: "Understanding machine learning, neural networks and modern AI applications.",
    date: "Recently updated",
    category: "Technology",
    color: "bg-blue-100 text-blue-700"
  },
  {
    id: 2,
    title: "My Learning Goals",
    content: "Topics and skills I want to explore and master.",
    date: "Recently updated",
    category: "Personal",
    color: "bg-green-100 text-green-700"
  },
  {
    id: 3,
    title: "Web Development Resources",
    content: "Useful resources for frontend and backend development.",
    date: "Recently updated",
    category: "Development",
    color: "bg-purple-100 text-purple-700"
  }
];

function RecentNotes() {
  const navigate = useNavigate();

  return (
    <section className="rounded-2xl border border-[#17243D]/5 bg-[#FFFAF1] p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#17243D]">
            Recent Notes
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Continue where you left off.
          </p>
        </div>

        <button
          onClick={() => navigate("/notes")}
          className="flex items-center gap-2 text-sm font-semibold text-[#F47768] transition hover:text-[#17243D]"
        >
          View all
          <ArrowRight size={17} />
        </button>
      </div>

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
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-[#17243D]">
                  {note.title}
                </h3>

                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${note.color}`}>
                  {note.category}
                </span>
              </div>

              <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-500">
                {note.content}
              </p>

              <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                <Clock size={13} />
                {note.date}
              </div>
            </div>

            <ArrowRight
              size={18}
              className="mt-2 shrink-0 text-gray-400"
            />
          </motion.button>
        ))}
      </div>

      <button
        onClick={() => navigate("/notes")}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#17243D]/20 py-3 text-sm font-semibold text-[#17243D] transition hover:border-[#F47768] hover:bg-[#F47768]/5"
      >
        <Plus size={17} />
        Create your first note
      </button>
    </section>
  );
}

export default RecentNotes;