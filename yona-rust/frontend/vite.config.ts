import { tanstackRouterGenerator } from "@tanstack/router-plugin/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    tanstackRouterGenerator({
      generatedRouteTree: "src/routeTree.gen.ts",
      routesDirectory: "src/routes",
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
  ],
});
