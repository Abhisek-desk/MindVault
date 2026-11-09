import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";

import router from "./router";
import { useAuthStore } from "../stores/auth.store";
import SyncManager from "../components/offline/SyncManager";
import { resetPendingChanges } from "../db/sync.db";

function App() {
  const initializeAuth = useAuthStore(
    (state) => state.initializeAuth
  );

  useEffect(() => {
    const initializeApplication = async () => {
      try {
        // Recover changes interrupted by a browser shutdown.
        await resetPendingChanges();

        console.log(
          "Interrupted synchronization changes recovered."
        );
      } catch (error) {
        console.error(
          "Synchronization recovery failed:",
          error
        );
      }

      // Initialize authentication only after recovery finishes.
      await initializeAuth();
    };

    void initializeApplication();
  }, [initializeAuth]);

  return (
    <>
      <SyncManager />
      <RouterProvider router={router} />
    </>
  );
}

export default App;