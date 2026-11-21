import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],

  // Must match the deployed public URL path. Change only with a matching host rewrite.
  base: "/",

  server: {
    port: 5173,
    // Peers fetch our public artifacts from other origins during development.
    cors: true,
  },

  // The runtime, manifest, network, links, bridge, .well-known and data/ files
  // live in public/ and are copied verbatim by Vite. Do NOT import them from JS:
  // boot() derives the Worker URL from import.meta.url and peers fetch by path.
  build: {
    outDir: "dist",
    sourcemap: true,
  },

  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
