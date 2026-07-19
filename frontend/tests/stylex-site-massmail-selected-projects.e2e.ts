import { readFileSync } from "node:fs";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

async function mockSession(page: Page) {
  const fulfill = (route: Route) =>
    route.fulfill({
      headers: { "x-csrf-token": "csrf-site-massmail-selected-projects" },
      json: { isAnonymous: false, isSiteAdmin: true },
    });
  await page.route("**/api/v1/session", fulfill);
  await page.route("**/api/auth/session", fulfill);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/projects", (route) =>
    route.fulfill({ json: { projects: [{ ownerName: "admin", projectName: "projectYobi" }] } }),
  );
}

test("site mass-mail keeps the legacy unadorned project wrapper and selected-project container", async ({
  page,
}) => {
  const route = readFileSync("src/routes/sites/massmail.tsx", "utf8");
  const legacy = readFileSync("../yona-original/app/views/site/massMail.scala.html", "utf8");
  const less = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const legacyScript = readFileSync(
    "../yona-original/public/javascripts/service/yobi.site.MassMail.js",
    "utf8",
  );
  const css = readFileSync("src/app.css", "utf8");

  // Legacy Scala HTML/LESS is output DOM/UX evidence; behavior remains React-owned.
  expect(legacy).toContain('id="project-list-wrap"');
  expect(legacy).toContain('id="selected-projects"');
  expect(less).toContain(".mess-mail-wrap");
  expect(legacyScript).toContain('$(\'<span class="label label-info">\' + sName + " </span>")');
  expect(legacyScript).toContain(".css('margin-right','5px')");
  expect(route).toContain('data-stylex-owner="site-massmail-selected-projects"');
  expect(route).toContain('data-stylex-owner="site-massmail-selected-project-remove"');
  expect(route).not.toContain("projectWrapperPanel");
  expect(route).not.toContain("selectedProjects: {");
  expect(route).toContain("styles.selectedProjectRemove");
  expect(route).toContain(
    'className={`selected-project-remove ${stylex.props(styles.selectedProjectRemove).className ?? ""}`.trim()}',
  );
  expect(css).not.toContain(".site-admin-page #project-list-wrap {");
  expect(css).not.toContain(".site-admin-page #selected-projects {");
  expect(css).not.toContain(".site-admin-page .selected-project-remove {");
  expect(css).toContain(".site-admin-page .project-select-row {");

  for (const viewport of [
    { height: 900, width: 1366 },
    { height: 844, width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await mockSession(page);
    await page.goto(`${basePath}/sites/massmail`);
    await page.locator("#mailtoPrj").check();
    await page.locator("#input-project").fill("admin/projectYobi");
    await page.locator("#select-project").click();
    expect(
      await page.locator("#project-list-wrap").evaluate((wrapper) => {
        const selectedProjects = wrapper.querySelector<HTMLElement>("#selected-projects")!;
        const styles = getComputedStyle(wrapper);
        const selectedStyles = getComputedStyle(selectedProjects);
        return {
          borderTopWidth: styles.borderTopWidth,
          marginBottom: styles.marginBottom,
          marginTop: styles.marginTop,
          paddingTop: styles.paddingTop,
          selectedDisplay: selectedStyles.display,
          selectedGap: selectedStyles.gap,
          selectedMarginTop: selectedStyles.marginTop,
          selectedMinHeight: selectedStyles.minHeight,
        };
      }),
    ).toEqual({
      borderTopWidth: "0px",
      marginBottom: "10px",
      marginTop: "0px",
      paddingTop: "0px",
      selectedDisplay: "block",
      selectedGap: "normal",
      selectedMarginTop: "0px",
      selectedMinHeight: "0px",
    });
  }
});
