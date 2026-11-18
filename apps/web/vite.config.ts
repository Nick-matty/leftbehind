import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    port: 3000,
    allowedHosts: [
      "pv-41449ba595c5-b9de2a29-be82-4b7e-95aa-e79a48ac6a8d.style.dev",
      ".style.dev",
    ],
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        /** Vendor chunks stay stable across app edits, so a copy or page change
         * no longer invalidates the cached React and UI libraries. */
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return;
          if (id.includes("maplibre-gl")) return "vendor-maplibre";
          if (id.includes("@astryxdesign") || id.includes("@stylexjs"))
            return;
          // Astryx (and its StyleX runtime) is deliberately left unnamed: only
          // /design imports it, so Rollup keeps it inside that lazy route's
          // chunk. Naming it loaded it on every page instead.
          if (id.includes("react-router")) return "vendor-router";
          // React itself is on every page and rarely changes: keep it in its
          // own long-lived chunk so app edits don't invalidate ~70 kB gzip of
          // framework code.
          if (
            id.includes("react-dom") ||
            id.includes("node_modules/react/") ||
            id.includes("scheduler")
          ) {
            return "vendor-react";
          }
          // Everything else is left unnamed so it follows its real importers.
          return;
        },
      },
    },
  },
});
