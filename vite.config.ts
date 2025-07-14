import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// @ts-expect-error: sin tipos disponibles
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig(({ mode }) => ({
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

  // 🔧 Solución crítica para evitar el error de React desincronizado
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react-dom/client"],
  },

  optimizeDeps: {
    include: ["react", "react-dom", "react-dom/client"],
  },

  build: {
    chunkSizeWarningLimit: 800, // opcional, para advertencias de tamaño
    rollupOptions: {
      output: {
        manualChunks(id) {
          // 🔁 Separación lógica con orden controlado
          if (id.includes("node_modules")) {
            if (/[\\/]react[\\/]/.test(id)) return "react"; // react/react-dom primero
            if (id.includes("@tanstack/react-query")) return "react-query";
            if (id.includes("react-router-dom")) return "react-router-dom";
            if (id.includes("lucide-react")) return "lucide-react";
            if (id.match(/[\\/]@radix-ui[\\/]/)) return "radix"; // radix después de React
          }
          if (id.includes(path.resolve(__dirname, "src/utils"))) {
            return "utils";
          }
        },
      },
      preserveEntrySignatures: "strict", // 🛡️ asegura orden de carga
    },
  },

  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.ts",
  },
}));

