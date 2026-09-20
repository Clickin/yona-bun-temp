import { expect, test } from "vitest";
import { LEGACY_LANGUAGE_CODES, lookupLegacyMessage } from "./i18n";

const productBrandedLegacyMessageKeys = [
  "app.name",
  "emails.validation.email.title",
  "label.copy.description",
  "project.git.url.alert",
  "project.path.desc",
  "site.data.import.info",
  "site.features.issueTracker",
  "site.features.workTeam",
  "site.update.currentVersion",
  "site.update.isAvailable",
  "site.update.notification",
  "title.yobi.feedback",
  "viaEmail.help.description",
] as const;

test("legacy product message values render with Yoram branding in every locale", () => {
  for (const language of LEGACY_LANGUAGE_CODES) {
    for (const key of productBrandedLegacyMessageKeys) {
      const message = lookupLegacyMessage(language, key);
      expect(message, `${language}: ${key}`).not.toMatch(/\b(?:naver|yobi|yona)\b/iu);
    }
  }

  expect(lookupLegacyMessage("en-US", "site.update.currentVersion")).toContain("{0}");
  expect(lookupLegacyMessage("en-US", "viaEmail.help.description")).toContain("{1}");
  expect(lookupLegacyMessage("en-US", "project.onmember", { args: ["one"] })).toContain(
    "yobicon-friends",
  );
});
