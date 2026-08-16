import { createRouter } from "@tanstack/react-router";
import { readRuntimeConfig, type RuntimeConfig } from "./runtime-config";
import { routeTree } from "./routeTree.gen";

// Legacy Yona URLs carry plain query values (`?assigneeId=1`) and repeated
// keys for arrays (`labelIds=8&labelIds=9`), but TanStack's default
// serializer JSON-encodes any string that parses as JSON (`"1"` ->
// `assigneeId=%221%22`) and encodes arrays as a single JSON value
// (`labelIds=%5B%228%22%5D`). Serialize plain strings raw, arrays as
// repeated keys, and parse numeric strings back as strings so the round-trip
// keeps values stable for validateSearch implementations that only accept
// strings.
function parseValue(value: string): unknown {
  try {
    const parsed = JSON.parse(value) as unknown;
    return typeof parsed === "number" ? value : parsed;
  } catch {
    return value;
  }
}

function parseSearch(searchStr: string): Record<string, unknown> {
  const raw = searchStr.startsWith("?") ? searchStr.slice(1) : searchStr;
  const params = new URLSearchParams(raw);
  const result: Record<string, unknown> = Object.create(null);
  for (const [key, value] of params.entries()) {
    const parsed = parseValue(value);
    if (key in result) {
      const previous = result[key];
      result[key] = Array.isArray(previous) ? [...previous, parsed] : [previous, parsed];
    } else {
      result[key] = parsed;
    }
  }
  return result;
}

function encodeSearchValue(value: string): string {
  // Legacy Yona URLs keep `[`/`]` raw (`?filter=[P1]`); URLSearchParams
  // percent-encodes them, which would break the pinned legacy hrefs.
  return encodeURIComponent(value).replace(/%5B/gu, "[").replace(/%5D/gu, "]");
}

function stringifySearch(search: Record<string, unknown>): string {
  const pairs: string[] = [];
  for (const [key, value] of Object.entries(search)) {
    if (value === undefined || value === null) {
      continue;
    }
    const encodedKey = encodeSearchValue(key);
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined && item !== null) {
          pairs.push(`${encodedKey}=${encodeSearchValue(String(item))}`);
        }
      }
    } else if (typeof value === "object") {
      pairs.push(`${encodedKey}=${encodeSearchValue(JSON.stringify(value))}`);
    } else if (value !== "") {
      // Legacy Yona URLs omit empty search values (`?state=open` not
      // `?state=open&assigneeId=`).
      pairs.push(`${encodedKey}=${encodeSearchValue(String(value))}`);
    }
  }
  return pairs.length > 0 ? `?${pairs.join("&")}` : "";
}

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
