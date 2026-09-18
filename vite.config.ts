import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // "prompt" en vez de "autoUpdate": una versión nueva no recarga la página
      // sola (podría interrumpir a alguien a mitad de un conteo) — se avisa con
      // un banner y la persona decide cuándo actualizar (ver UpdatePrompt.tsx).
      registerType: "prompt",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Control de Depósito",
        short_name: "Depósito",
        description: "Pedidos de reposición SAN / SCN",
        theme_color: "#111827",
        background_color: "#111827",
        display: "standalone",
        orientation: "portrait",
        lang: "es",
        icons: [
          { src: "pwa-192.svg", sizes: "192x192", type: "image/svg+xml" },
          { src: "pwa-512.svg", sizes: "512x512", type: "image/svg+xml" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,json}"]
      }
    })
  ],
  test: {
    exclude: ["node_modules/**", "e2e/**"]
  }
});