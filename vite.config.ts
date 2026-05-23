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
        // The diya video is large; include it explicitly so the session works offline.
        globPatterns: ["**/*.{js,css,html,svg,png,ico,mp4,woff,woff2}"],
        // Bump the cache size limit to accommodate the diya video (~few MB).
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        // Don't cache MediaPipe WASM/model — they're large and update separately.
        navigateFallbackDenylist: [/^\/api\//, /\.task$/, /\.wasm$/],
      },
      devOptions: {
        // Enable service worker in dev so you can test PWA behavior locally.
        enabled: false,
      },
    }),
  ],
});
