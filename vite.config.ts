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
      // Monorepo-ready aliases for the packages/ workspace. Every KSYK
      // package resolves through the @ksyk/* namespace so the eventual
      // "flip to a real workspaces monorepo" is a one-line change in
      // package.json — no import rewrites.
      "@ksyk/shared": path.resolve(import.meta.dirname, "packages", "shared", "src"),
      "@ksyk/renderer": path.resolve(import.meta.dirname, "packages", "renderer", "src"),
      "@ksyk/routing": path.resolve(import.meta.dirname, "packages", "routing", "src"),
      "@ksyk/api": path.resolve(import.meta.dirname, "packages", "api", "src"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
