import { tanstackRouterGenerator } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

function normalizeBasePath(input: string | undefined): string {
  const trimmed = (input ?? "").trim();
  if (trimmed === "" || trimmed === "/") {
    return "/";
  }

  const normalized = `/${trimmed}`.replace(/\/+/g, "/").replace(/\/$/, "");
  return normalized === "" ? "/" : normalized;
}

function prefixBasePath(basePath: string, leaf: string): string {
  return basePath === "/" ? `/${leaf}` : `${basePath}/${leaf}`;
}

function buildBackendProxy(basePath: string, target: string) {
  return Object.fromEntries(
    ["api", "rpc", "files", "user/email"].map((leaf) => [
      prefixBasePath(basePath, leaf),
      {
        changeOrigin: false,
        target,
      },
    ]),
  );
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const basePath = normalizeBasePath(env.VITE_YONA_BASE_PATH);
  const backendTarget = env.YONA_DEV_BACKEND_TARGET || "http://127.0.0.1:8089";

  return {
    base: basePath === "/" ? "/" : `${basePath}/`,
    plugins: [
      tanstackRouterGenerator({
        generatedRouteTree: "src/routeTree.gen.ts",
        routesDirectory: "src/routes",
        target: "react",
        autoCodeSplitting: true,
      }),
      react(),
    ],
    server: {
      host: "127.0.0.1",
      port: 3101,
      proxy: buildBackendProxy(basePath, backendTarget),
    },
    build: {
      chunkSizeWarningLimit: 700,
    },
  };
});
