import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: false,
      allow: [
        // Allow serving files from anywhere in the workspace
        "..",
        // Specifically allow serving MathLive fonts
        "../node_modules/mathlive",
        "../node_modules/.vite/deps",
      ],
      deny: [],
    },
  },
  assetsInclude: [
    "**/*.woff",
    "**/*.woff2", 
    "**/*.ttf",
    "**/*.otf",
    "**/*.eot"
  ],
  optimizeDeps: {
    include: ["mathlive"],
    exclude: []
  },
});
