import { motion } from "motion/react";
import { Sparkles, Plus, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuthStore } from "../../../stores/auth.store";

function WelcomeSection() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-3xl bg-[#17243D] p-7 text-white shadow-lg md:p-10"
    >
      <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#F47768]/20 blur-3xl" />

      <div className="pointer-events-none absolute -bottom-24 right-1/3 h-48 w-48 rounded-full bg-blue-400/10 blur-3xl" />

      <div className="relative z-10 max-w-2xl">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium text-[#FFD3CD]">
          <Sparkles size={15} />
          Your knowledge journey continues
        </div>

        <h1 className="text-3xl font-bold leading-tight md:text-4xl">
          Welcome back, {firstName}!
        </h1>

        <p className="mt-4 max-w-lg text-sm leading-7 text-gray-300 md:text-base">
          Your ideas, notes and knowledge are all in one place.
          Keep learning, organizing and building your personal
          knowledge library.
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <button
            onClick={() => navigate("/notes")}
            className="flex items-center gap-2 rounded-xl bg-[#B83E32] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#962F27]"
          >
            <Plus size={18} />
            Create a Note
          </button>

          <button
            onClick={() => navigate("/library")}
            className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            <BookOpen size={18} />
            Explore Library
          </button>
        </div>
      </div>
    </motion.section>
  );
}

export default WelcomeSection;