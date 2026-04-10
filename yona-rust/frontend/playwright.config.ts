import { defineConfig } from "@playwright/test";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: "./tests",
  testMatch: /.*\.e2e\.ts/,
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:3101",
    channel: "msedge",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm dev",
    cwd: currentDirectory,
    reuseExistingServer: true,
    timeout: 60_000,
    url: "http://127.0.0.1:3101",
  },
});
