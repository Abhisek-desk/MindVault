import { useState } from "react";
import { motion } from "motion/react";

import Sidebar from "../components/Sidebar";
import DashboardHeader from "../components/DashboardHeader";
import WelcomeSection from "../components/WelcomeSection";
import StatsCards from "../components/StatsCards";
import RecentNotes from "../components/RecentNotes";
import QuickActions from "../components/QuickActions";

function DashboardPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="mx-auto max-w-[1600px] space-y-8 p-5 md:p-8"
        >
          <WelcomeSection />

          <StatsCards />

          <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <RecentNotes />
            </div>

            <div className="xl:col-span-1">
              <QuickActions />
            </div>
          </div>

          <footer className="border-t border-[#17243D]/10 pt-5 text-center text-xs text-[#596273]">
            © {new Date().getFullYear()} Mind Vault. Your Knowledge.
            Your Memory. Always Available.
          </footer>
        </motion.div>
      </main>
    </div>
  );
}

export default DashboardPage;