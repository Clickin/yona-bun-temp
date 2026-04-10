import { createRoot } from "react-dom/client";
import { App } from "./App";
import { readRuntimeConfig, type RuntimeConfig } from "./runtime-config";
import { resolveCurrentPath, type AppRoute } from "./auth-workspace-client";

export interface CreateAppOptions {
  runtimeConfig?: RuntimeConfig;
}

export function resolveNavigationTarget(href: string):
  | { mode: "external"; href: string }
  | { mode: "internal"; route: AppRoute } {
  return resolveNavigationTargetWithBasePath(href, "/");
}

export function resolveNavigationTargetWithBasePath(
  href: string,
  basePath: string,
):
  | { mode: "external"; href: string }
  | { mode: "internal"; route: AppRoute } {
  const route = resolveCurrentPath(href, { basePath });
  if (route.kind === "external") {
    return { href, mode: "external" };
  }

  return { mode: "internal", route };
}

export function createApp(options: CreateAppOptions = {}) {
  const runtimeConfig = options.runtimeConfig ?? readRuntimeConfig();
  const currentHref =
    typeof window === "undefined"
      ? "/"
      : `${window.location.pathname}${window.location.search}`;

  return {
    currentPath:
      typeof window === "undefined"
        ? ({ kind: "public-home", href: "/" } satisfies AppRoute)
        : resolveCurrentPath(currentHref, { basePath: runtimeConfig.basePath }),
    runtimeConfig,
    title: "Yona Rust Frontend",
  };
}

export function mountApp(container: Element, options: CreateAppOptions = {}) {
  const app = createApp(options);
  return createRoot(container).render(<App runtimeConfig={app.runtimeConfig} />);
}

if (typeof document !== "undefined") {
  const mountNode = document.getElementById("root");

  if (mountNode) {
    mountApp(mountNode);
  }
}
