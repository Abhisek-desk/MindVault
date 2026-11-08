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
});

ReactDOM.createRoot(
  document.getElementById("root")!
).render(
  <React.StrictMode>
    <Providers>
      <App />
    </Providers>
  </React.StrictMode>
);