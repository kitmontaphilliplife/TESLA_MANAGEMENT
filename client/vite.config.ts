import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ["react-transition-group", "react-dom/client"],
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      // service-tesla-admin (TeslaAdminApi) — real backend, PathBase /tesla-admin @ :5277
      "/tesla-admin": "http://localhost:5277",
      // legacy prototype server (Express + SQLite @ :4000) — endpoints not yet migrated
      "/api": "http://localhost:4000",
      "/uploads": "http://localhost:4000",
    },
  },
});
