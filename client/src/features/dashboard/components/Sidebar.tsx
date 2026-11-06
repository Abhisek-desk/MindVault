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
  Vault
} from "lucide-react";

import { useAuthStore } from "../../../stores/auth.store";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigationItems = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "My Library", path: "/library", icon: BookOpen },
  { name: "My Notes", path: "/notes", icon: FileText },
  { name: "Folders", path: "/folders", icon: Folder },
  { name: "Learning", path: "/learning", icon: Brain }
];

function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

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
        {/* Brand */}
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

        {/* Navigation */}
        <div className="mt-12">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-400">
            Workspace
          </p>

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
                  {item.name}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User and Settings */}
        <div className="mt-auto space-y-2">
          <button
            onClick={() => navigate("/settings")}
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