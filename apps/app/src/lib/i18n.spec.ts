import { describe, expect, it } from "vitest";
import { formatMessage, normalizeLocale, resolveLocale, translateMessage } from "@yona/i18n";

describe("@yona/i18n app integration", () => {
  it("normalizes supported locales and falls back to english", () => {
    expect(normalizeLocale("en-US")).toBe("en");
    expect(normalizeLocale("ko")).toBe("ko-KR");
    expect(normalizeLocale("ko_kr")).toBe("ko-KR");
    expect(normalizeLocale("fr-FR")).toBe("en");
  });

  it("picks the first supported locale candidate", () => {
    expect(resolveLocale([undefined, "fr-FR", "ko-KR"])).toBe("ko-KR");
    expect(resolveLocale([undefined, "ko", "en-US"])).toBe("ko-KR");
  });

  it("formats placeholders with positional arguments", () => {
    expect(formatMessage("Found {0} result(s) in {1}", [3, "Projects"])).toBe(
      "Found 3 result(s) in Projects",
    );
  });

  it("translates legacy-backed strings with interpolation", () => {
    expect(translateMessage("en", "title.loginFor", "Yona")).toBe("Log in to Yona");
    expect(translateMessage("ko-KR", "title.loginFor", "Yona")).toBe("Yona 로그인");
    expect(translateMessage("ko", "button.signup", "Yona")).toBe("Yona 시작 하기");
  });
});
