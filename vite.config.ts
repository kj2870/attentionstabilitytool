import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Files in /public to include in the precache (icons, video).
      includeAssets: [
        "favicon.svg",
        "icon-192.png",
        "icon-512.png",
        "icon-maskable.png",
        "apple-touch-icon.png",
      ],
      manifest: {
        name: "Drishti",
        short_name: "Drishti",
        description:
          "A daily ritual to train attention and calm the mind. Real-time eye-tracking meditation.",
        theme_color: "#0E0E10",
        background_color: "#0E0E10",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/icon-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Precache the diya video and the ambient/transition audio so the
        // session works offline and doesn't redownload on each visit.
        globPatterns: ["**/*.{js,css,html,svg,png,ico,mp4,mp3,woff,woff2}"],
        // Fire ambience is the largest precached asset (~7MB) — bump the cap.
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        // Don't cache MediaPipe WASM/model — they're large and update separately.
        navigateFallbackDenylist: [/^\/api\//, /\.task$/, /\.wasm$/],
      },
      devOptions: {
        // Enable service worker in dev so you can test PWA behavior locally.
        enabled: false,
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Split heavy vendor deps so the landing page TTI isn't blocked by
        // session-only dependencies (MediaPipe vision is the biggest by far).
        manualChunks: {
          mediapipe: ["@mediapipe/tasks-vision"],
          supabase: ["@supabase/supabase-js"],
          react: ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
});
