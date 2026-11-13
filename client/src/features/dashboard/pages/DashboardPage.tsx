import { useState } from "react";
import {
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react";

import Sidebar from "../components/Sidebar";
import DashboardHeader from "../components/DashboardHeader";
import WelcomeSection from "../components/WelcomeSection";
import StatsCards from "../components/StatsCards";
import RecentNotes from "../components/RecentNotes";
import QuickActions from "../components/QuickActions";

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
};

const sectionVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

function DashboardPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

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
          variants={shouldReduceMotion ? undefined : containerVariants}
          initial={shouldReduceMotion ? false : "hidden"}
          animate="visible"
          className="mx-auto max-w-[1600px] space-y-8 p-5 md:p-8"
        >
          <motion.section
            variants={shouldReduceMotion ? undefined : sectionVariants}
          >
            <WelcomeSection />
          </motion.section>

          <motion.section
            variants={shouldReduceMotion ? undefined : sectionVariants}
          >
            <StatsCards />
          </motion.section>

          <motion.div
            variants={shouldReduceMotion ? undefined : sectionVariants}
            className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3"
          >
            <div className="xl:col-span-2">
              <RecentNotes />
            </div>

            <div className="xl:col-span-1">
              <QuickActions />
            </div>
          </motion.div>

          <motion.footer
            variants={shouldReduceMotion ? undefined : sectionVariants}
            className="border-t border-[#17243D]/10 pt-5 text-center text-xs text-[#596273]"
          >
            © {new Date().getFullYear()} Mind Vault. Your Knowledge.
            Your Memory. Always Available.
          </motion.footer>
        </motion.div>
      </main>
    </div>
  );
}

export default DashboardPage;