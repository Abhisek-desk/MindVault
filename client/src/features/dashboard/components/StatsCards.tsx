import { motion } from "motion/react";

import {
  FileText,
  Folder,
  BookOpen,
  Brain
} from "lucide-react";

const statistics = [
  {
    title: "Total Notes",
    value: "0",
    description: "Your saved thoughts",
    icon: FileText,
    iconColor: "text-[#F47768]",
    iconBackground: "bg-[#F47768]/10"
  },
  {
    title: "Folders",
    value: "0",
    description: "Organized collections",
    icon: Folder,
    iconColor: "text-blue-600",
    iconBackground: "bg-blue-100"
  },
  {
    title: "Knowledge Packs",
    value: "0",
    description: "Offline resources",
    icon: BookOpen,
    iconColor: "text-green-600",
    iconBackground: "bg-green-100"
  },
  {
    title: "Learning Progress",
    value: "0%",
    description: "Your learning journey",
    icon: Brain,
    iconColor: "text-purple-600",
    iconBackground: "bg-purple-100"
  }
];

function StatsCards() {
  return (
    <section>
      <div className="mb-5">
        <h2 className="text-xl font-bold text-[#17243D]">
          Your Overview
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          A quick look at your knowledge workspace.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {statistics.map((stat, index) => {
          const Icon = stat.icon;

          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: index * 0.1
              }}
              className="rounded-2xl border border-[#17243D]/5 bg-[#FFFAF1] p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div
                  className={`rounded-xl p-3 ${stat.iconBackground}`}
                >
                  <Icon
                    size={22}
                    className={stat.iconColor}
                  />
                </div>
              </div>

              <p className="mt-5 text-sm font-medium text-gray-500">
                {stat.title}
              </p>

              <h3 className="mt-1 text-3xl font-bold text-[#17243D]">
                {stat.value}
              </h3>

              <p className="mt-2 text-xs text-gray-400">
                {stat.description}
              </p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

export default StatsCards;