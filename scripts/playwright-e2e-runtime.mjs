import crypto from "node:crypto";
import path from "node:path";
import net from "node:net";
import { resolveDevConfig } from "./dev-config.mjs";

const mountedBasePath = "/yona";

export function buildPlaywrightE2eRuntime({ backendPort, frontendPort, repoRoot, runToken }) {
  const frontendOrigin = `http://127.0.0.1:${frontendPort}`;
  const backendOrigin = `http://127.0.0.1:${backendPort}`;
  const devConfig = resolveDevConfig({
    YONA_DEV_BACKEND_TARGET: backendOrigin,
    YONA_DEV_BASE_PATH: mountedBasePath,
    YONA_DEV_PUBLIC_ORIGIN: frontendOrigin,
  });
  const frontendSessionUrl = new URL("api/auth/session", devConfig.frontendUrl).toString();
  const runtimeDirectory = path.join(repoRoot, ".yona-data", "e2e", runToken);

  return {
    backendEnv: {
      YONA_BIND_ADDR: `127.0.0.1:${backendPort}`,
      YONA_DEV_BASE_PATH: devConfig.basePath,
      YONA_DEV_PUBLIC_ORIGIN: frontendOrigin,
      YONA_DEV_RUNTIME_DIR: runtimeDirectory,
      YONA_E2E_BACKEND_ORIGIN: backendOrigin,
      YONA_E2E_BACKEND_PORT: String(backendPort),
      YONA_E2E_FRONTEND_ORIGIN: frontendOrigin,
      YONA_E2E_FRONTEND_PORT: String(frontendPort),
      YONA_E2E_FRONTEND_SESSION_URL: frontendSessionUrl,
      YONA_E2E_FRONTEND_URL: devConfig.frontendUrl,
      YONA_E2E_RUN_TOKEN: runToken,
      YONA_E2E_RUNTIME_DIR: runtimeDirectory,
      YONA_E2E_SESSION_URL: devConfig.backendSessionUrl,
    },
    backendOrigin,
    backendPort,
    backendSessionUrl: devConfig.backendSessionUrl,
    frontendEnv: {
      VITE_YONA_BASE_PATH: devConfig.basePath,
      YONA_DEV_BACKEND_TARGET: backendOrigin,
      YONA_E2E_BACKEND_ORIGIN: backendOrigin,
      YONA_E2E_BACKEND_PORT: String(backendPort),
      YONA_E2E_FRONTEND_ORIGIN: frontendOrigin,
      YONA_E2E_FRONTEND_PORT: String(frontendPort),
      YONA_E2E_FRONTEND_SESSION_URL: frontendSessionUrl,
      YONA_E2E_FRONTEND_URL: devConfig.frontendUrl,
      YONA_E2E_RUN_TOKEN: runToken,
      YONA_E2E_RUNTIME_DIR: runtimeDirectory,
      YONA_E2E_SESSION_URL: devConfig.backendSessionUrl,
    },
    frontendOrigin,
    frontendPort,
    frontendSessionUrl,
    frontendUrl: devConfig.frontendUrl,
    runToken,
    runtimeDirectory,
  };
}

export function createPlaywrightE2eRunToken() {
  return `${Date.now().toString(36)}-${process.pid}-${crypto.randomBytes(3).toString("hex")}`;
}

export async function reserveOpenPort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Failed to resolve an open TCP port.")));
        return;
      }

      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(address.port);
      });
    });
  });
}
