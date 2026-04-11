import { defineConfig } from "@playwright/test";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const mountedBasePath = "/yona";
const frontendOrigin = "http://127.0.0.1:3101";
const backendOrigin = "http://127.0.0.1:8089";

export default defineConfig({
  testDir: "./tests",
  testMatch: /.*\.e2e\.ts/,
  timeout: 30_000,
  use: {
    baseURL: frontendOrigin,
    channel: "msedge",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node ../scripts/run-dev-backend-once.mjs",
      cwd: currentDirectory,
      env: {
        ...process.env,
        YONA_DEV_BASE_PATH: mountedBasePath,
        YONA_DEV_PUBLIC_ORIGIN: frontendOrigin,
      },
      reuseExistingServer: true,
      timeout: 60_000,
      url: `${backendOrigin}${mountedBasePath}/api/auth/session`,
    },
    {
      command: "pnpm dev",
      cwd: currentDirectory,
      env: {
        ...process.env,
        VITE_YONA_BASE_PATH: mountedBasePath,
        YONA_DEV_BACKEND_TARGET: backendOrigin,
      },
      reuseExistingServer: true,
      timeout: 60_000,
      url: `${frontendOrigin}${mountedBasePath}/`,
    },
  ],
});
