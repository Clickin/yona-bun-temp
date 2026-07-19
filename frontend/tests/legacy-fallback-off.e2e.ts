import { expect, test } from "@playwright/test";

const generatedFallbackHref = "legacy-assets/stylesheets/legacy-fallback.css";

test("generated fallback excludes only proven dead Yobi selectors", async ({ page }) => {
  test.skip(
    process.env.VITE_DISABLE_LEGACY_FALLBACK === "1",
    "normal runtime asset contract",
  );

  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/") ? configuredBasePath : `${configuredBasePath}/`;
  await page.goto(basePath, { waitUntil: "commit" });

  const fallbackLink = page.locator(`link[href$="${generatedFallbackHref}"]`);
  await expect(fallbackLink).toHaveCount(1);
  const fallbackHref = await fallbackLink.getAttribute("href");
  if (!fallbackHref) {
    throw new Error("Generated legacy fallback link must have an href.");
  }
  const fallbackCss = await page.evaluate(async (href) => {
    const response = await fetch(href);
    return response.text();
  }, fallbackHref);

  for (const selector of [
    ".all-projects .project .info-wrap .forked",
    ".all-projects .project .stats-wrap .like",
    ".all-projects .project .stats-wrap .like .num",
    ".all-projects .project .stats-wrap .like .ico",
    ".profile-frmwrap .avatar-frm",
    ".profile-frmwrap .avatar-frm .avatar-wrap",
    ".profile-frmwrap .avatar-frm .avatar-wrap .progress",
    ".profile-frmwrap .avatar-frm .avatar-wrap .progress.loading",
    ".profile-frmwrap .avatar-frm .btn-wrap",
    ".profile-frmwrap .avatar-frm .btn-wrap .nbtn i",
    ".milestones .milestone .infos .desc",
  ]) {
    expect(fallbackCss).not.toContain(`${selector} {`);
  }

  expect(fallbackCss).toContain(".all-projects .project .stats-wrap .members {");
  expect(fallbackCss).toContain(".profile-frmwrap dl {");
  expect(fallbackCss).toContain(".profile-frmwrap form {");
  expect(fallbackCss).toContain(".milestones .milestone .infos .progress-wrap {");
  expect(fallbackCss).toContain(".milestones .milestone .infos .actrow {");
  expect(fallbackCss).toContain(".milestones .milestone .completion-rate {");
});

test("fallback-off discovery mode removes the generated legacy stylesheet", async ({ page }) => {
  test.skip(
    process.env.VITE_DISABLE_LEGACY_FALLBACK !== "1",
    "runs only through test:e2e:fallback-off",
  );

  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/") ? configuredBasePath : `${configuredBasePath}/`;
  await page.goto(basePath, { waitUntil: "commit" });

  await expect(
    page.locator(`link[href$="${generatedFallbackHref}"]`),
  ).toHaveCount(0);
  await expect(page.locator("#root")).toHaveCount(1);
});
