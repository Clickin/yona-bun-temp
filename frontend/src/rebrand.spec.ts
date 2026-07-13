import { existsSync, readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { LEGACY_LANGUAGE_CODES, lookupLegacyMessage } from "./i18n";
import { normalizeSiteName } from "./runtime-config";

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

test("Yoram is the frontend product default", () => {
  const indexHtml = readFileSync(new URL("../index.html", import.meta.url), "utf8");

  expect(normalizeSiteName(undefined)).toBe("Yoram");
  expect(indexHtml).toContain("<title>Yoram</title>");
  expect(indexHtml).toContain('content="Yoram"');
  expect(indexHtml).toContain('href="./src/assets/yoram-favicon.svg"');
  expect(indexHtml).not.toContain("legacy-assets/images/favicon.ico");
});

test("the release bundle source excludes unreferenced upstream identity assets", () => {
  for (const fileName of [
    "favicon.ico",
    "logo.png",
    "logo-orange.png",
    "logo-white.png",
    "yobi-logo.png",
    "yobi-title.png",
    "yobi_logo.png",
    "yobi_orange.png",
    "yobi_symbol_w.png",
    "yobi_w.png",
    "yobi_intro_code.jpg",
    "yona-logo.png",
    "yona_logo.png",
  ]) {
    expect(existsSync(new URL(`../public/legacy-assets/images/${fileName}`, import.meta.url))).toBe(
      false,
    );
  }
});

test("legacy product message values render with Yoram branding in every locale", () => {
  for (const language of LEGACY_LANGUAGE_CODES) {
    for (const key of productBrandedLegacyMessageKeys) {
      const message = lookupLegacyMessage(language, key);
      expect(message, `${language}: ${key}`).not.toMatch(/\b(?:naver|yobi|yona)\b/iu);
    }
    expect(lookupLegacyMessage(language, "title.yobi.feedback")).toBe("Yoram repository");
  }

  expect(lookupLegacyMessage("en-US", "site.update.currentVersion")).toContain("{0}");
  expect(lookupLegacyMessage("en-US", "viaEmail.help.description")).toContain("{1}");
  expect(lookupLegacyMessage("en-US", "project.onmember", { args: ["one"] })).toContain(
    "yobicon-friends",
  );
});

test("shared Markdown help examples are product-neutral until a public Yoram repository exists", () => {
  const markdownHelpSource = readFileSync(
    new URL("./routes/-legacy-markdown-help.tsx", import.meta.url),
    "utf8",
  );

  expect(markdownHelpSource).not.toMatch(
    /(?:yobi\.io|repo\.yona\.io|demo\.yobi\.io|@yobi|"Yobi")/u,
  );
  expect(markdownHelpSource).toContain('[Site](https://example.com/ "Example Site")');
  expect(markdownHelpSource).toContain(
    '![title](https://example.com/images/sample.png "Sample image")',
  );
  expect(markdownHelpSource).toContain("Mention: @example");
});
