import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  // 🧠 Caché de compilación única por ejecución (evita errores extraños de módulos)
  cacheDir: `node_modules/.vite_cache_${Date.now()}`,

  // 🌐 Servidor local
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

  // 🔌 Plugins
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
    dedupe: ["react", "react-dom"], // Evita múltiples Reacts (por Radix o CMDK)
  },

  // 🧠 Optimización de dependencias
  optimizeDeps: {
    include: ["react", "react-dom"],
  },

  // 🏗️ Configuración del build
  build: {
    chunkSizeWarningLimit: 1000,
    target: "es2020",
    rollupOptions: {
      preserveEntrySignatures: "strict",
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (/[\\/]react[\\/]/.test(id)) return "react";
            if (id.includes("@radix-ui")) return "radix";
            if (id.includes("@tanstack/react-query")) return "react-query";
            if (id.includes("react-router-dom")) return "react-router-dom";
            if (id.includes("lucide-react")) return "icons";
          }

          if (id.includes(path.resolve(__dirname, "src/utils"))) {
            return "utils";
          }
        },
      },
    },
  },

  // 🧪 Testing con Vitest
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.ts",
  },
}));




