import { beforeEach, describe, expect, it, vi } from "vitest";

const serverState = vi.hoisted(() => ({
  cookie: undefined as string | undefined,
  request: new Request("http://localhost/"),
  setCookie: vi.fn(),
}));

vi.mock("@tanstack/react-start/server", () => ({
  getCookie: vi.fn(() => serverState.cookie),
  getRequest: vi.fn(() => serverState.request),
  getRequestHeader: vi.fn((name: string) => serverState.request.headers.get(name)),
  setCookie: serverState.setCookie,
}));

import { readCurrentLocaleServer } from "./locale.server";

describe("readCurrentLocaleServer", () => {
  beforeEach(() => {
    serverState.cookie = undefined;
    serverState.request = new Request("http://localhost/");
    serverState.setCookie.mockReset();
  });

  it("prefers the lang query override and persists it", () => {
    serverState.cookie = "en";
    serverState.request = new Request("http://localhost/?lang=ko");

    expect(readCurrentLocaleServer()).toEqual({ locale: "ko-KR" });
    expect(serverState.setCookie).toHaveBeenCalledWith(
      "yona-locale",
      "ko-KR",
      expect.objectContaining({ path: "/", sameSite: "lax" }),
    );
  });

  it("falls back to accept-language and persists the inferred locale", () => {
    serverState.request = new Request("http://localhost/", {
      headers: {
        "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8",
      },
    });

    expect(readCurrentLocaleServer()).toEqual({ locale: "ko-KR" });
    expect(serverState.setCookie).toHaveBeenCalledWith(
      "yona-locale",
      "ko-KR",
      expect.objectContaining({ path: "/", sameSite: "lax" }),
    );
  });

  it("skips unsupported leading languages and respects weighted fallbacks", () => {
    serverState.request = new Request("http://localhost/", {
      headers: {
        "accept-language": "fr-FR,en;q=0.8,ko;q=0.9",
      },
    });

    expect(readCurrentLocaleServer()).toEqual({ locale: "ko-KR" });
    expect(serverState.setCookie).toHaveBeenCalledWith(
      "yona-locale",
      "ko-KR",
      expect.objectContaining({ path: "/", sameSite: "lax" }),
    );
  });

  it("reuses the locale cookie when no override is present", () => {
    serverState.cookie = "ko-KR";

    expect(readCurrentLocaleServer()).toEqual({ locale: "ko-KR" });
    expect(serverState.setCookie).not.toHaveBeenCalled();
  });
});
