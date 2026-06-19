import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { readRuntimeConfig, type RuntimeConfig } from "./runtime-config";

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
      projectDefaultMenus: ["code", "issue", "pullRequest", "review", "milestone", "board"],
      projectDefaultScope: "public",
      showUserEmail: true,
      siteName: "Yona",
      supportedLanguages: ["en-US", "ko-KR", "ja-JP", "ru-RU", "uz-UZ"],
    });
  });

  it("normalizes a mounted base path and derived endpoints", () => {
    globalThis.window = {} as Window & typeof globalThis;
    const browserWindow = window as Window & {
      __YONA_RUNTIME_CONFIG__?: Partial<RuntimeConfig>;
    };
    browserWindow.__YONA_RUNTIME_CONFIG__ = {
      apiBaseUrl: "/yona/api",
      basePath: "/yona/",
      projectDefaultMenus: ["issue", "pull-request", "unknown"],
      projectDefaultScope: "private",
      showUserEmail: false,
      siteName: "Legacy Yona",
      supportedLanguages: ["ko-KR", "", "en-US"],
    };

    expect(readRuntimeConfig()).toEqual({
      apiBaseUrl: "/yona/api",
      basePath: "/yona",
      projectDefaultMenus: ["issue", "pullRequest"],
      projectDefaultScope: "private",
      showUserEmail: false,
      siteName: "Legacy Yona",
      supportedLanguages: ["ko-KR", "en-US"],
    });
  });

  it("falls back to vite env runtime config when the server did not inject one", () => {
    globalThis.window = {} as Window & typeof globalThis;
    process.env.VITE_YONA_BASE_PATH = "/yona";
    process.env.VITE_YONA_LANGS = "ja-JP, en-US";
    process.env.VITE_YONA_PROJECT_DEFAULT_MENUS = "issue,board";
    process.env.VITE_YONA_SITE_NAME = "Dev Yona";
    process.env.VITE_YONA_SHOW_USER_EMAIL = "false";
    (import.meta as { env?: Record<string, string> }).env = {
      ...originalImportMetaEnv,
      VITE_YONA_BASE_PATH: "/yona",
      VITE_YONA_LANGS: "ja-JP, en-US",
      VITE_YONA_PROJECT_DEFAULT_MENUS: "issue,board",
      VITE_YONA_SITE_NAME: "Dev Yona",
      VITE_YONA_SHOW_USER_EMAIL: "false",
    };

    expect(readRuntimeConfig()).toEqual({
      apiBaseUrl: "/yona/api",
      basePath: "/yona",
      projectDefaultMenus: ["issue", "board"],
      projectDefaultScope: "public",
      showUserEmail: false,
      siteName: "Dev Yona",
      supportedLanguages: ["ja-JP", "en-US"],
    });
  });

  it("does not reference node process env in browser runtime source", () => {
    const source = readFileSync(new URL("./runtime-config.ts", import.meta.url), "utf8");

    expect(source).not.toContain("process.env");
  });
});
