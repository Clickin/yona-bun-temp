import { createRouter } from "@tanstack/react-router";
import { readRuntimeConfig, type RuntimeConfig } from "./runtime-config";
import { routeTree } from "./routeTree.gen";

export function getRouter(runtimeConfig: RuntimeConfig = readRuntimeConfig()) {
  return createRouter({
    basepath: runtimeConfig.basePath,
    routeTree,
    context: {
      runtimeConfig,
    },
    defaultPreload: "intent",
    scrollRestoration: true,
  });
}

export const router = getRouter();

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
