import { lazy, Suspense, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

// =====================================
// LAZY-LOADED PAGES
// =====================================

export const LoginPage = lazy(
  () => import("../features/auth/pages/LoginPage"),
);

export const RegisterPage = lazy(
  () => import("../features/auth/pages/RegisterPage"),
);

export const DashboardPage = lazy(
  () => import("../features/dashboard/pages/DashboardPage"),
);

export const NotesPage = lazy(
  () => import("../features/notes/pages/NotesPage"),
);

export const FoldersPage = lazy(
  () => import("../features/library/pages/FoldersPage"),
);

export const LibraryPage = lazy(
  () => import("../features/library/pages/LibraryPage"),
);

export const PackReaderPage = lazy(
  () => import("../features/library/pages/PackReaderPage"),
);

export const SearchPage = lazy(
  () => import("../features/search/pages/SearchPage"),
);

export const ConflictsPage = lazy(
  () => import("../features/sync/pages/ConflictsPage"),
);

export const LearningPage = lazy(
  () => import("../features/learning/pages/LearningPage"),
);

export const LandingPage = lazy(
  () => import("../features/landing/pages/LandingPage"),
);

export const SyncDiagnosticsPage = lazy(
  () => import("../features/sync/pages/SyncDiagnosticsPage"),
);

export const SettingsPage = lazy(
  () => import("../features/settings/pages/SettingsPage"),
);

export const NotificationsPage = lazy(
  () => import("../features/settings/pages/NotificationsPage"),
);

// =====================================
// LOADING FALLBACK
// =====================================

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F1E5]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#17243D]/20 border-t-[#F47768]" />

        <p className="text-sm font-medium text-[#17243D]">
          Loading Mind Vault...
        </p>
      </div>
    </div>
  );
}

// =====================================
// ANIMATED ROUTE PAGE
// =====================================

export function RoutePage({
  children,
}: {
  children: ReactNode;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <Suspense fallback={<PageLoader />}>
      <motion.div
        initial={
          shouldReduceMotion
            ? false
            : {
                opacity: 0,
                y: 12,
              }
        }
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: shouldReduceMotion ? 0 : 0.32,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="min-w-0"
      >
        {children}
      </motion.div>
    </Suspense>
  );
}