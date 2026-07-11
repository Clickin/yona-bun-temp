import { tanstackRouter } from "@tanstack/router-plugin/vite";
import type { IncomingMessage } from "node:http";
import { fileURLToPath, URL } from "node:url";
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

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildBackendProxy(basePath: string, target: string) {
  const staticPrefixes = Object.fromEntries(
    [
      "-_-api",
      "api",
      "files",
      "markdown",
      "rpc",
      "user/email",
      "user/sidebar",
      "user/usermenuTabContentList",
    ].map((leaf) => [
      prefixBasePath(basePath, leaf),
      {
        changeOrigin: false,
        target,
      },
    ]),
  );
  const projectCompatibilityPattern =
    basePath === "/"
      ? "^/[^/]+/[^/]+/(issue/labels|labels|mentionList|mentionListAtCommitDiff)(?:[/?#]|$)"
      : `^${escapeRegExp(basePath)}/[^/]+/[^/]+/(issue/labels|labels|mentionList|mentionListAtCommitDiff)(?:[/?#]|$)`;
  const notificationPattern =
    basePath === "/"
      ? "^/notification(?:[/?#]|$)"
      : `^${escapeRegExp(basePath)}/notification(?:[/?#]|$)`;
  return {
    ...staticPrefixes,
    [notificationPattern]: {
      bypass(request: IncomingMessage) {
        const accept = request.headers.accept ?? "";
        const acceptValue = Array.isArray(accept) ? accept.join(",") : accept;
        if (acceptValue.includes("text/html")) {
          return request.url;
        }
        return undefined;
      },
      changeOrigin: false,
      target,
    },
    [projectCompatibilityPattern]: {
      changeOrigin: false,
      target,
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const basePath = normalizeBasePath(env.VITE_YONA_BASE_PATH);
  const backendTarget = env.YONA_DEV_BACKEND_TARGET || "http://127.0.0.1:8089";

  return {
    base: basePath === "/" ? "/" : `${basePath}/`,
    plugins: [
      tanstackRouter({
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
    preview: {
      proxy: buildBackendProxy(basePath, backendTarget),
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    build: {
      chunkSizeWarningLimit: 700,
    },
  };
});
