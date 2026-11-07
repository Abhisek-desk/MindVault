
import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";

import router from "./router";
import { useAuthStore } from "../stores/auth.store";
import SyncManager from "../components/offline/SyncManager";

function App() {
  const initializeAuth = useAuthStore(
    (state) => state.initializeAuth
  );

  useEffect(() => {
    void initializeAuth();
  }, [initializeAuth]);

  return (
    <>
      <SyncManager />
      <RouterProvider router={router} />
    </>
  );
}

export default App;
