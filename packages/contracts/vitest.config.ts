import tsConfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    tsConfigPaths({
      ignoreConfigErrors: true,
      projects: ["./tsconfig.json"],
    }),
  ],
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts"],
  },
});
