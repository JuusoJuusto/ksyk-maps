import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    {
      name: "html-xml-compat",
      transformIndexHtml: {
        order: "post",
        handler(html: string) {
          return html
            .replace(/\bcrossorigin\b(?!\s*=)/g, 'crossorigin="anonymous"')
            .replace(/<(link|meta|base|br|hr|img|input|area|col|embed|param|source|track|wbr)(\b[^>]*[^/])>/g, '<$1$2/>');
        },
      },
    },
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
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor split: react core stays in the main chunk (tiny).
          // Large libraries that are only needed on specific routes get
          // their own chunks so the public map page doesn't pay for them.
          if (id.includes("node_modules")) {
            if (id.includes("posthog-js"))                 return "vendor-posthog";
            if (id.includes("maplibre-gl") || id.includes("maplibre"))
                                                           return "vendor-maplibre";
            if (id.includes("framer-motion"))              return "vendor-motion";
            if (id.includes("@radix-ui") || id.includes("cmdk"))
                                                           return "vendor-radix";
            if (id.includes("recharts") || id.includes("d3-"))
                                                           return "vendor-charts";
            if (id.includes("react-query") || id.includes("@tanstack"))
                                                           return "vendor-query";
            if (id.includes("i18next"))                    return "vendor-i18n";
            if (id.includes("lucide-react"))               return "vendor-icons";
            if (id.includes("date-fns"))                   return "vendor-dates";
          }
        },
      },
    },
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
