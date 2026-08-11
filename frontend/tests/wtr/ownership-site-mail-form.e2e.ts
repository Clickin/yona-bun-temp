import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

// Browser harness: node:fs/promises readFile has no browser equivalent; the
// compat readFileSync is a sync XHR over the same middleware. Promise-wrap it
// so the spec's await/Promise.all call sites keep their shape.
const readFile = (path: string | URL, encoding?: string | null): Promise<string> =>
  Promise.resolve(readFileSync(path, encoding ?? "utf8"));

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = new URL("../src/routes/sites/mail.tsx", import.meta.url);
const legacyTemplate = new URL(
  "../../yona-original/app/views/site/mail.scala.html",
  import.meta.url,
);
const responsiveBootstrap = new URL(
  "../../yona-original/public/bootstrap/css/bootstrap-responsive.css",
  import.meta.url,
);
// frozen base bootstrap.css — .form-horizontal .control-label lives here, not
// in bootstrap-responsive.css (mail form horizontal cascade)
const bootstrapCss = new URL(
  "../../yona-original/public/bootstrap/css/bootstrap.css",
  import.meta.url,
);
const appCss = new URL("../src/app.css", import.meta.url);

async function mockSession(page: Page) {
  const fulfill = async (route: Route) => {
    await route.fulfill({
      headers: { "x-csrf-token": "csrf-site-mail-form" },
      json: { isAnonymous: false, isSiteAdmin: true },
    });
  };
  await page.route("**/api/v1/session", fulfill);
  await page.route("**/api/auth/session", fulfill);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/mail", (route) =>
    route.fulfill({
      json: { notConfiguredItems: [], sender: "site-admin@yona.local", sent: false },
    }),
  );
}

test("site mail configured form owns frozen Bootstrap horizontal and responsive rules", async ({
  page,
}) => {
  const [route, legacy, responsive, bootstrap, appCssSource] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(legacyTemplate, "utf8"),
    readFile(responsiveBootstrap, "utf8"),
    readFile(bootstrapCss, "utf8"),
    readFile(appCss, "utf8"),
  ]);
  expect(legacy).toContain('class="form-horizontal"');
  expect(legacy).toContain('class="control-group mr10"');
  expect(legacy).toContain('class="control-label span3"');
  expect(legacy).toContain('class="span12 input-xlarge textbody"');
  expect(responsive).toContain("@media (max-width: 767px)");
  expect(responsive).toContain('input[class*="span"]');
  // frozen bootstrap.css (not the responsive variant) owns the horizontal
  // control-label cascade
  expect(bootstrap).toContain(".form-horizontal .control-label");
  // e2e closure ledger (2026-08-11): app.css carries one OWNER-scoped fork-page
  // bridge ([data-owner="project-fork-page"] .form-horizontal …), which is a
  // legitimate project-fork mobile collapse — anchor the no-bridge assertion to
  // unowned selectors (line start) instead of the raw substring.
  expect(appCssSource).not.toMatch(/^\.form-horizontal \.control-group/u);
  expect(appCssSource).not.toMatch(/^\.form-horizontal \.control-label/u);
  expect(appCssSource).not.toMatch(/^\.form-horizontal \.controls/u);
  expect(route).toContain('data-owner="site-mail-form"');
  expect(route).toContain('data-owner="site-mail-form-group"');
  expect(route).toContain('data-owner="site-mail-form-label"');
  expect(route).toContain('data-owner="site-mail-form-controls"');
  expect(route).toContain('data-owner="site-mail-form-field"');

  await mockSession(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/sites/mail`);

  const form = page.locator('[data-owner="site-mail-form"]');
  const groups = page.locator('[data-owner="site-mail-form-group"]');
  const labels = page.locator('[data-owner="site-mail-form-label"]');
  const controls = page.locator('[data-owner="site-mail-form-controls"]');
  const fields = page.locator('[data-owner="site-mail-form-field"]');
  await expect(form).toBeVisible();
  await expect(groups).toHaveCount(4);
  await expect(labels).toHaveCount(4);
  await expect(controls).toHaveCount(4);
  await expect(fields).toHaveCount(4);
  await expect(form).not.toHaveClass(/form-horizontal/);
  await expect(groups.first()).not.toHaveClass(/control-group/);
  await expect(labels.first()).not.toHaveClass(/control-label|span3/);
  await expect(page.locator('input[name="from"]')).not.toHaveClass(/span4/);
  await expect(page.locator('input[name="subject"]')).not.toHaveClass(/span12/);
  await expect(page.locator("#body")).not.toHaveClass(/span12|input-xlarge|textbody/);
  await expect(labels.first()).toHaveCSS("width", "160px");
  await expect(labels.first()).toHaveCSS("text-align", "right");
  await expect(controls.first()).toHaveCSS("margin-left", "180px");
  await expect(page.locator('input[name="from"]')).toHaveCSS("width", "286px");
  await expect(page.locator('input[name="subject"]')).toHaveCSS("width", "926px");
  await expect(page.locator("#body")).toHaveCSS("width", "926px");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(labels.first()).toHaveCSS("float", "none");
  await expect(labels.first()).toHaveCSS("text-align", "left");
  await expect(controls.first()).toHaveCSS("margin-left", "0px");
  expect(
    await fields.evaluateAll((elements) =>
      elements.every((element) => {
        const field = element.getBoundingClientRect();
        const controls = element.parentElement?.getBoundingClientRect();
        return Boolean(
          controls &&
          Math.abs(field.left - controls.left) <= 1 &&
          Math.abs(field.right - controls.right) <= 1,
        );
      }),
    ),
  ).toBe(true);
});
