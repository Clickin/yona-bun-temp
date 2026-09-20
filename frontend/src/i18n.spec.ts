import { describe, expect, it } from "vitest";
import { createLegacyI18nRuntime, formatLegacyTimestamp, LEGACY_LANGUAGE_CODES } from "./i18n";

describe("formatLegacyTimestamp", () => {
  it("uses the selected translation language for tooltip day periods across noon", () => {
    const runtime = createLegacyI18nRuntime(LEGACY_LANGUAGE_CODES);
    const { t } = runtime;
    const periods = [
      ["en-US", "AM", "PM"],
      ["ko-KR", "오전", "오후"],
      ["ja-JP", "午前", "午後"],
      ["ru-RU", "AM", "PM"],
      ["uz-UZ", "AM", "PM"],
    ];

    for (const [language, am, pm] of periods) {
      runtime.setLanguage(language);
      expect([
        formatLegacyTimestamp("2026-09-19T00:00:00", t).title,
        formatLegacyTimestamp("2026-09-19T11:59:59", t).title,
        formatLegacyTimestamp("2026-09-19T12:00:00", t).title,
      ]).toEqual([
        `2026-09-19 12:00:00 ${am}`,
        `2026-09-19 11:59:59 ${am}`,
        `2026-09-19 12:00:00 ${pm}`,
      ]);
    }
  });
});
