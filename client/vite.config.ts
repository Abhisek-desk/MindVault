import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),

    VitePWA({
      registerType: "autoUpdate",

      includeAssets: [
        "favicon.svg",
      ],

      manifest: {
        name: "Mind Vault",
        short_name: "MindVault",
        description:
          "Your Knowledge. Your Memory. Always Available.",

        theme_color: "#17243D",
        background_color: "#F8F1E5",

        display: "standalone",
        orientation: "any",

        start_url: "/",
        scope: "/",
      },

      workbox: {
        globPatterns: [
          "**/*.{js,css,html,ico,png,svg,woff2}",
        ],

        navigateFallback: "index.html",

        cleanupOutdatedCaches: true,

        clientsClaim: true,

        skipWaiting: true,
      },
    }),
  ],

  server: {
    port: 5173,

    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});