import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { sentryVitePlugin } from "@sentry/vite-plugin";

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
    // Inline critical CSS so the two render-blocking stylesheet fetches
    // (300 ms + 150 ms per Lighthouse) stop blocking LCP.
    // Only runs during a real production build to keep dev HMR fast.
    {
      name: "critical-css",
      apply: "build",
      async closeBundle() {
        // critters ships types in src/index.d.ts but its package.json
        // "exports" map hides them from the TS resolver.  @ts-ignore is
        // the correct workaround until the package ships its own .d.ts.
        // @ts-ignore
        const Critters = (await import("critters")).default;
        const distDir = path.resolve(import.meta.dirname, "dist/public");
        const htmlPath = path.join(distDir, "index.html");
        if (!fs.existsSync(htmlPath)) return;
        const critters = new Critters({
          path: distDir,
          publicPath: "/",
          // Non-critical stylesheets are loaded asynchronously; critters
          // rewrites <link rel="stylesheet"> to load with media="print"
          // and the onload trick, then a <noscript> fallback.
          preload: "swap",
          inlineFonts: false,
          pruneSource: false,
          logLevel: "warn",
        });
        const result = await critters.process(fs.readFileSync(htmlPath, "utf-8"));
        fs.writeFileSync(htmlPath, result);
      },
    },
    // Upload source maps to Sentry only when the auth token is present
    // (typically set in CI/CD). Local builds still emit .map files but
    // never upload — no token, no upload, build succeeds either way.
    ...(process.env.SENTRY_AUTH_TOKEN
      ? [
          sentryVitePlugin({
            org: process.env.SENTRY_ORG ?? "ksyk-maps",
            project: process.env.SENTRY_PROJECT ?? "javascript-react",
            authToken: process.env.SENTRY_AUTH_TOKEN,
            sourcemaps: { filesToDeleteAfterUpload: ["dist/public/**/*.map"] },
          }),
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
    // Source maps allow Sentry to show real file/line numbers in error reports.
    // Upload only happens when SENTRY_AUTH_TOKEN is set (CI/CD); local builds
    // still emit .map files but never upload them.
    sourcemap: true,
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
