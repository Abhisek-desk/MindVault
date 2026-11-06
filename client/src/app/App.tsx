import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";

import router from "./router";
import { useAuthStore } from "../stores/auth.store";

function App() {
  const initializeAuth = useAuthStore(
    (state) => state.initializeAuth
  );

  useEffect(() => {
    void initializeAuth();
  }, [initializeAuth]);

  return <RouterProvider router={router} />;
}

export default App;