import { createRouter, parseSearchWith, stringifySearchWith } from "@tanstack/react-router";
import { readRuntimeConfig, type RuntimeConfig } from "./runtime-config";
import { routeTree } from "./routeTree.gen";

// Legacy Yona URLs carry raw query values (`?assigneeId=1`), but the default
// TanStack serializer JSON-encodes any string that parses as JSON (`"1"` ->
// `assigneeId=%221%22`). Serialize plain strings raw (objects/arrays still
// JSON-encode) and parse numeric strings back as strings, so the round-trip
// keeps values stable for validateSearch implementations that only accept
// strings.
const parseSearch = parseSearchWith((value: string) => {
  const parsed = JSON.parse(value) as unknown;
  return typeof parsed === "number" ? value : parsed;
});
const stringifySearch = stringifySearchWith(JSON.stringify);

export function getRouter(runtimeConfig: RuntimeConfig = readRuntimeConfig()) {
  return createRouter({
    basepath: runtimeConfig.basePath,
    routeTree,
    context: {
      runtimeConfig,
    },
    defaultPreload: "intent",
    parseSearch,
    scrollRestoration: true,
    stringifySearch,
  });
}

export const router = getRouter();

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
