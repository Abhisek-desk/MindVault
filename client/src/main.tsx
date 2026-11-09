/// <reference types="vite-plugin-pwa/client" />

import React from "react";
import ReactDOM from "react-dom/client";

import { registerSW } from "virtual:pwa-register";

import App from "./app/App";
import Providers from "./app/providers";

import "./styles/global.css";

// Register the PWA service worker.
registerSW({
  immediate: true,

  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;

    console.log("Mind Vault service worker registered.");

    // Check for application updates every hour.
    window.setInterval(
      () => {
        if (navigator.onLine) {
          void registration.update();
        }
      },
      60 * 60 * 1000,
    );
  },

  onRegisterError(error) {
    console.error("Service worker registration failed:", error);
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Providers>
      <App />
    </Providers>
  </React.StrictMode>,
);
