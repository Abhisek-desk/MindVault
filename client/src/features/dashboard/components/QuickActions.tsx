import { motion } from "motion/react";
import {
  FilePlus,
  FolderPlus,
  Download,
  Sparkles,
  ArrowUpRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const actions = [
  {
    title: "Create a Note",
    description: "Capture a new idea.",
    icon: FilePlus,
    path: "/notes",
    color: "bg-[#F47768]/10 text-[#B83E32]"
  },
  {
    title: "New Folder",
    description: "Organize your knowledge.",
    icon: FolderPlus,
    path: "/folders",
    color: "bg-blue-100 text-blue-600"
  },
  {
    title: "Explore Library",
    description: "Discover knowledge packs.",
    icon: Download,
    path: "/library",
    color: "bg-green-100 text-green-600"
  },
  {
    title: "AI Assistant",
    description: "Ask questions about your notes.",
    icon: Sparkles,
    path: "/ai-assistant",
    color: "bg-purple-100 text-purple-600"
  }
];

function QuickActions() {
  const navigate = useNavigate();

  return (
    <section className="rounded-2xl border border-[#17243D]/5 bg-[#FFFAF1] p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#17243D]">
          Quick Actions
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          What would you like to do today?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
        {actions.map((action, index) => {
          const Icon = action.icon;

          return (
            <motion.button
              key={action.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => navigate(action.path)}
              className="group flex items-center gap-4 rounded-xl border border-[#17243D]/5 p-4 text-left transition hover:border-[#F47768]/30 hover:bg-[#F8F1E5]/60"
            >
              <div className={`rounded-xl p-3 ${action.color}`}>
                <Icon size={21} />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-[#17243D]">
                  {action.title}
                </h3>

                <p className="mt-1 text-xs text-gray-500">
                  {action.description}
                </p>
              </div>

              <ArrowUpRight
                size={18}
                className="text-[#596273] transition group-hover:text-[#B83E32]"
              />
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}

export default QuickActions;