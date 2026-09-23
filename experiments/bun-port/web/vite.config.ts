import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  build: { rolldownOptions: { external: ["bun"] } },
  server: { host: "127.0.0.1", port: 3810, strictPort: true },
  plugins: [tanstackStart(), react()],
});
