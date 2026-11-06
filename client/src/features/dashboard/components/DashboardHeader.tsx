import {
  Menu,
  Search,
  Bell,
  Wifi,
  WifiOff
} from "lucide-react";

import { useAuthStore } from "../../../stores/auth.store";

interface DashboardHeaderProps {
  onMenuClick: () => void;
}

function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  const user = useAuthStore((state) => state.user);
  const isOnline = navigator.onLine;

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between gap-4 border-b border-[#17243D]/5 bg-[#FFFAF1]/95 px-5 backdrop-blur-md md:px-8">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="rounded-xl p-2 text-[#17243D] transition hover:bg-[#F8F1E5] lg:hidden"
          aria-label="Open navigation"
        >
          <Menu size={23} />
        </button>

        <div className="hidden sm:block">
          <h2 className="text-lg font-bold text-[#17243D]">
            My Workspace
          </h2>
          <p className="text-xs text-gray-500">
            Your personal knowledge space
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-end gap-3 md:gap-5">
        <div className="relative hidden w-full max-w-md md:block">
          <Search
            size={19}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            type="search"
            placeholder="Search your knowledge..."
            className="w-full rounded-xl border border-[#17243D]/10 bg-[#F8F1E5]/60 py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#F47768] focus:ring-2 focus:ring-[#F47768]/10"
          />
        </div>

        <div
          className={`hidden items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold sm:flex ${
            isOnline
              ? "bg-green-100 text-green-700"
              : "bg-orange-100 text-orange-700"
          }`}
        >
          {isOnline ? <Wifi size={15} /> : <WifiOff size={15} />}
          {isOnline ? "Online" : "Offline"}
        </div>

        <button
          className="relative rounded-xl p-2.5 text-[#17243D] transition hover:bg-[#F8F1E5]"
          aria-label="Notifications"
        >
          <Bell size={21} />

          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#F47768]" />
        </button>

        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#17243D] font-bold text-white">
          {user?.name?.charAt(0).toUpperCase() || "U"}
        </div>
      </div>
    </header>
  );
}

export default DashboardHeader;