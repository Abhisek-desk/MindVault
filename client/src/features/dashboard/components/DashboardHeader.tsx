import {
  Menu,
  Search,
  Bell,
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import { useAuthStore } from "../../../stores/auth.store";
import { useSyncStore } from "../../../stores/sync.store";

interface DashboardHeaderProps {
  onMenuClick: () => void;
}

function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  const user = useAuthStore((state) => state.user);

  const status = useSyncStore((state) => state.status);
  const lastSyncedAt = useSyncStore((state) => state.lastSyncedAt);
  const syncNow = useSyncStore((state) => state.syncNow);

  const isOnline = status !== "offline";

  const statusDetails = {
    idle: {
      label: "Not synced yet",
      color: "bg-gray-100 text-gray-600",
    },
    syncing: {
      label: "Syncing...",
      color: "bg-blue-100 text-blue-700",
    },
    synced: {
      label: "Synced",
      color: "bg-green-100 text-green-700",
    },
    error: {
      label: "Sync failed",
      color: "bg-red-100 text-red-700",
    },
    offline: {
      label: "Waiting for internet",
      color: "bg-orange-100 text-orange-700",
    },
  };

  const currentStatus = isOnline
    ? statusDetails[status]
    : statusDetails.offline;

  return (
    <header className="sticky top-0 z-30 flex min-h-20 items-center justify-between gap-4 border-b border-[#17243D]/5 bg-[#FFFAF1]/95 px-5 py-3 backdrop-blur-md md:px-8">
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

      <div className="flex flex-1 items-center justify-end gap-3 md:gap-4">
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

        <div className="hidden items-center gap-2 sm:flex">
          {isOnline ? (
            <Wifi size={16} className="text-green-600" />
          ) : (
            <WifiOff size={16} className="text-orange-600" />
          )}

          <span className="text-xs font-semibold text-gray-600">
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>

        <div
          title={
            lastSyncedAt
              ? `Last synced: ${new Date(lastSyncedAt).toLocaleString()}`
              : "No successful synchronization yet"
          }
          className={`hidden items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold sm:flex ${currentStatus.color}`}
        >
          {status === "syncing" && isOnline && (
            <RefreshCw size={14} className="animate-spin" />
          )}

          {status === "synced" && isOnline && (
            <CheckCircle2 size={14} />
          )}

          {status === "error" && isOnline && (
            <AlertCircle size={14} />
          )}

          {currentStatus.label}
        </div>

        <button
          onClick={() => void syncNow()}
          disabled={!isOnline || status === "syncing"}
          className="flex items-center gap-2 rounded-xl bg-[#17243D] px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-[#263958] disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
          title="Synchronize your data"
        >
          <RefreshCw
            size={15}
            className={status === "syncing" ? "animate-spin" : ""}
          />

          <span className="hidden sm:inline">
            {status === "syncing" ? "Syncing" : "Sync Now"}
          </span>
        </button>

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