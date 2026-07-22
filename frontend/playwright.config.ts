import { defineConfig } from "@playwright/test";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const mountedBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const frontendOrigin = process.env.YONA_E2E_FRONTEND_ORIGIN ?? "http://127.0.0.1:3101";
const backendOrigin = process.env.YONA_E2E_BACKEND_ORIGIN ?? "http://127.0.0.1:8089";
const wrapperManagesServers = process.env.YONA_E2E_MANAGED_SERVERS === "1";
const browserChannel = process.env.PW_CHANNEL ?? "chrome";

export default defineConfig({
  testDir: "./tests",
  testMatch: /.*\.e2e\.ts/,
  timeout: 30_000,
  use: {
    baseURL: frontendOrigin,
    channel: browserChannel,
    trace: "retain-on-failure",
  },
  webServer: wrapperManagesServers
    ? []
    : [
        {
          command: "node ../scripts/run-dev-backend-once.mjs",
          cwd: currentDirectory,
          env: process.env,
          reuseExistingServer: false,
          timeout: 60_000,
          url: `${backendOrigin}${mountedBasePath}/api/auth/session`,
        },
        {
          command: "node ../scripts/run-e2e-frontend.mjs",
          cwd: currentDirectory,
          env: process.env,
          reuseExistingServer: false,
          timeout: 60_000,
          url: process.env.YONA_E2E_FRONTEND_URL ?? `${frontendOrigin}${mountedBasePath}/`,
        },
      ],
});
