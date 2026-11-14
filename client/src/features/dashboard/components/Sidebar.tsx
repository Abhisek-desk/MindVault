import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Folder,
  Brain,
  Settings,
  LogOut,
  X,
  Vault,
  Search,
  RefreshCw,
  Activity,
  Bell,
} from "lucide-react";

import { useAuthStore } from "../../../stores/auth.store";
import { useNotificationsStore } from "../../../stores/notifications.store";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigationItems = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "My Library", path: "/library", icon: BookOpen },
  { name: "My Notes", path: "/notes", icon: FileText },
  { name: "Folders", path: "/folders", icon: Folder },
  { name: "Learning", path: "/learning", icon: Brain },
  { name: "Search", path: "/search", icon: Search },
  { name: "Conflict Center", path: "/conflicts", icon: RefreshCw },
  { name: "Sync Diagnostics", path: "/sync", icon: Activity },
  { name: "Notifications", path: "/notifications", icon: Bell },
];

function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();

  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  const unreadCount = useNotificationsStore(
    (state) => state.unreadCount,
  );

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-72 shrink-0 flex-col bg-[#17243D] px-6 py-7 text-white shadow-xl transition-transform duration-300 ease-in-out lg:sticky lg:z-20 lg:translate-x-0 lg:shadow-none ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* BRAND */}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#F47768] p-2">
              <Vault size={23} />
            </div>

            <div>
              <h1 className="text-xl font-bold">Mind Vault</h1>
              <p className="text-xs text-gray-400">
                Your knowledge space
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-white/10 lg:hidden"
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        {/* NAVIGATION */}

        <div className="mt-12 min-h-0 flex-1 overflow-y-auto">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Workspace
            </p>

            {!isOnline && (
              <span className="flex items-center gap-1.5 rounded-full bg-[#F47768]/15 px-2.5 py-1 text-[10px] font-bold tracking-wider text-[#F47768]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#F47768]" />
                OFFLINE
              </span>
            )}
          </div>

          <nav className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? "bg-[#F47768] text-white shadow-lg"
                        : "text-gray-300 hover:bg-white/10 hover:text-white"
                    }`
                  }
                >
                  <Icon size={19} />

                  <span className="flex-1">
                    {item.name}
                  </span>

                  {item.path === "/notifications" &&
                    unreadCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#B83E32] px-1 text-[10px] font-bold text-white">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* USER AND SETTINGS */}

        <div className="mt-4 space-y-2">
          <button
            onClick={() => {
              navigate("/settings");
              onClose();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-gray-300 transition hover:bg-white/10 hover:text-white"
          >
            <Settings size={19} />
            Settings
          </button>

          <div className="border-t border-white/10 pt-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F47768] font-bold">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {user?.name || "User"}
                </p>

                <p className="truncate text-xs text-gray-400">
                  {user?.email || ""}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-gray-300 transition hover:bg-white/10 hover:text-[#F47768]"
            >
              <LogOut size={19} />
              Sign Out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;