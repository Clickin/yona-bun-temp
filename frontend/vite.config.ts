import { tanstackRouter } from "@tanstack/router-plugin/vite";
import stylex from "@stylexjs/unplugin";
import babel from "@rolldown/plugin-babel";
import type { IncomingMessage } from "node:http";
import { fileURLToPath, URL } from "node:url";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig, loadEnv, normalizePath } from "vite";
import { legacyFallbackEnabled, transformLegacyFallbackLink } from "./src/legacy-fallback-mode";

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

const FRONTEND_SRC_PREFIX = `${normalizePath(fileURLToPath(new URL("./src", import.meta.url)))}/`;

const STYLEX_SOURCE_ID_PATTERN = new RegExp(
  `^${escapeRegExp(FRONTEND_SRC_PREFIX)}.*\\.[cm]?[jt]sx?(?:\\?.*)?$`,
);

/**
 * 기본 importSources:
 * - stylex
 * - @stylexjs/stylex
 *
 * false positive는 무해하지만 false negative는 StyleX 변환 누락을 만들 수 있으므로
 * import 문법 전체를 엄격하게 검사하지 않고 패키지 specifier만 검사한다.
 */
const STYLEX_IMPORT_PATTERN = /["'](?:@stylexjs\/stylex|stylex)["']/;

function createStylexPlugin() {
  const plugin = stylex.vite({
    useCSSLayers: {
      before: ["legacy"],
      prefix: "stylex",
    },
  }) as any;

  const originalTransform = plugin.transform;

  if (originalTransform == null) {
    return plugin;
  }

  const originalHandler =
    typeof originalTransform === "function" ? originalTransform : originalTransform.handler;

  const originalHookOptions = typeof originalTransform === "function" ? {} : originalTransform;

  return {
    ...plugin,

    transform: {
      ...originalHookOptions,

      /*
       * Vite 8/Rolldown이 Rust 측에서 먼저 검사한다.
       *
       * 1. repository-root/frontend/src 아래인가?
       * 2. JS/TS 계열 파일인가?
       * 3. 코드에 StyleX package specifier가 있는가?
       */
      filter: {
        id: STYLEX_SOURCE_ID_PATTERN,
        code: STYLEX_IMPORT_PATTERN,
      },

      /*
       * 다른 bundler 또는 hook filter 처리 차이에 대비한 fallback 검사.
       */
      handler(code: string, id: string, options: any) {
        const normalizedId = normalizePath(id);

        if (!STYLEX_SOURCE_ID_PATTERN.test(normalizedId) || !STYLEX_IMPORT_PATTERN.test(code)) {
          return null;
        }

        return originalHandler.call(this, code, id, options);
      },
    },
  };
}

function buildBackendProxy(basePath: string, target: string) {
  const staticPrefixes = Object.fromEntries(
    [
      "-_-api",
      "api",
      "files",
      "markdown",
      "rpc",
      "logout",
      "user/email",
      "user/sidebar",
      "user/usermenuTabContentList",
      "users/logout",
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
  const includeLegacyFallback = legacyFallbackEnabled(
    env.VITE_DISABLE_LEGACY_FALLBACK ?? process.env.VITE_DISABLE_LEGACY_FALLBACK,
  );

  return {
    base: mode === "production" ? "./" : basePath === "/" ? "/" : `${basePath}/`,
    plugins: [
      createStylexPlugin(),
      tanstackRouter({
        generatedRouteTree: "src/routeTree.gen.ts",
        routesDirectory: "src/routes",
        target: "react",
        autoCodeSplitting: true,
      }),
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      {
        name: "yoram-legacy-fallback-mode",
        transformIndexHtml: {
          order: "pre",
          handler(html) {
            return transformLegacyFallbackLink(html, includeLegacyFallback);
          },
        },
      },
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
