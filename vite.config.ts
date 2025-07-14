import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig(({ mode }) => ({
  // 🌐 Servidor local
  cacheDir: `node_modules/.vite_rebuild_${Date.now()}`,
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },

  // 🧩 Plugins
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    visualizer({
      filename: "dist/stats.html",
      template: "treemap",
      gzipSize: true,
      brotliSize: true,
    }),
  ].filter(Boolean),

  // 📦 Resolución de módulos
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // 👇 deduplicación crítica para evitar múltiples Reacts
    dedupe: ["react", "react-dom"],
  },

  // 🧠 Optimización de dependencias para evitar dobles cargas
  optimizeDeps: {
    include: ["react", "react-dom"],
  },

  // 🏗️ Configuración del build
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (/[\\/]react[\\/]/.test(id)) return "react";
            if (id.includes("@tanstack/react-query")) return "react-query";
            if (id.includes("react-router-dom")) return "react-router-dom";
            if (id.includes("lucide-react")) return "lucide-react";
            if (id.match(/[\\/]@radix-ui[\\/]/)) return "radix";
          }
          if (id.includes(path.resolve(__dirname, "src/utils"))) {
            return "utils";
          }
        },
      },
      preserveEntrySignatures: "strict",
    },
  },

  // 🧪 Configuración de testing
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.ts",
  },
}));


