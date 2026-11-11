import { useEffect, useState } from "react";
import { RouterProvider } from "react-router-dom";

import router from "./router";

import { useAuthStore } from "../stores/auth.store";
import SyncManager from "../components/offline/SyncManager";

import { withAccountSessionLock } from "../services/account-session-lock";

import { acquireDatabaseLease } from "../db/database";
import { resetPendingChanges } from "../db/sync.db";

// =====================================
// ACCOUNT SYNCHRONIZATION RECOVERY
// =====================================

interface AccountSyncRecoveryProps {
  userId: string;
}

function AccountSyncRecovery({
  userId,
}: AccountSyncRecoveryProps) {
  const [isRecovered, setIsRecovered] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const recoverSynchronization = async (): Promise<void> => {
      let releaseLease: (() => void) | null = null;

      try {
        await withAccountSessionLock(async () => {
          // Protect the active account database during recovery.
          releaseLease = acquireDatabaseLease(userId);

          await resetPendingChanges();

          const currentState = useAuthStore.getState();

          // Do not activate synchronization for a different account.
          if (
            !cancelled &&
            currentState.isAuthenticated &&
            currentState.isDatabaseReady &&
            currentState.user?.id === userId
          ) {
            setIsRecovered(true);
          }
        });
      } catch {
        if (import.meta.env.DEV) {
          console.error(
            "Could not recover pending synchronization changes.",
          );
        }
      } finally {
        releaseLease?.();
      }
    };

    void recoverSynchronization();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!isRecovered) {
    return null;
  }

  return <SyncManager />;
}

// =====================================
// MAIN APPLICATION
// =====================================

function App() {
  const user = useAuthStore((state) => state.user);

  const isAuthenticated = useAuthStore(
    (state) => state.isAuthenticated,
  );

  const isDatabaseReady = useAuthStore(
    (state) => state.isDatabaseReady,
  );

  const initializeAuth = useAuthStore(
    (state) => state.initializeAuth,
  );

  useEffect(() => {
    void initializeAuth();
  }, [initializeAuth]);

  const canRecoverSynchronization =
    isAuthenticated &&
    isDatabaseReady &&
    user !== null;

  return (
    <>
      {canRecoverSynchronization && (
        <AccountSyncRecovery
          key={user.id}
          userId={user.id}
        />
      )}

      <RouterProvider router={router} />
    </>
  );
}

export default App;
