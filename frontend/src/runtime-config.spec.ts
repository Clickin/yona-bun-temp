import { afterEach, describe, expect, it } from "vitest";
import { readRuntimeConfig } from "./runtime-config";

const originalImportMetaEnv = { ...(import.meta as { env?: Record<string, string> }).env };
const originalProcessEnv = { ...process.env };

afterEach(() => {
  (import.meta as { env?: Record<string, string> }).env = { ...originalImportMetaEnv };
  process.env = { ...originalProcessEnv };
});

describe("readRuntimeConfig", () => {
  it("normalizes default runtime config when the server did not inject one", () => {
    globalThis.window = {} as Window & typeof globalThis;

    expect(readRuntimeConfig()).toEqual({
      apiBaseUrl: "/api",
      basePath: "/",
    });
  });

  it("normalizes a mounted base path and derived endpoints", () => {
    globalThis.window = {} as Window & typeof globalThis;
    window.__YONA_RUNTIME_CONFIG__ = {
      apiBaseUrl: "/yona/api",
      basePath: "/yona/",
    };

    expect(readRuntimeConfig()).toEqual({
      apiBaseUrl: "/yona/api",
      basePath: "/yona",
    });
  });

  it("falls back to vite env runtime config when the server did not inject one", () => {
    globalThis.window = {} as Window & typeof globalThis;
    process.env.VITE_YONA_BASE_PATH = "/yona";

    expect(readRuntimeConfig()).toEqual({
      apiBaseUrl: "/yona/api",
      basePath: "/yona",
    });
  });
});
