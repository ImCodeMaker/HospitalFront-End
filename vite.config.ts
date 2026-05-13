import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "apollo": ["@apollo/client", "graphql"],
          "tanstack": ["@tanstack/react-query"],
          "motion": ["framer-motion", "gsap"],
          "tauri": ["@tauri-apps/api", "@tauri-apps/plugin-http", "@tauri-apps/plugin-opener", "@tauri-apps/plugin-store"],
          "signalr": ["@microsoft/signalr"],
          "qrcode": ["qrcode"],
          "axios": ["axios"],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? { protocol: "ws", host, port: 1421 }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
