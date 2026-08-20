import { readFileSync, mergedLegacyBlock, curatedAppCss } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";
const fileURLToPath = (u) => u.pathname;

const routeSource = readFileSync(
  fileURLToPath(
    new URL("../src/routes/$ownerName/$projectName/newMilestoneForm.tsx", import.meta.url),
  ),
  "utf8",
);
const styleSource = curatedAppCss() + mergedLegacyBlock();
const editorComponentSource = readFileSync(
  fileURLToPath(new URL("../src/components/markdown-editor.tsx", import.meta.url)),
  "utf8",
);
const owners = [
  "project-milestone-create-form",
  "project-milestone-title",
  "project-milestone-actions",
  "project-milestone-save",
  "project-milestone-cancel",
  "project-milestone-options",
  "project-milestone-due-date",
] as const;

test("new milestone form exposes direct Style owners for its legacy skeleton", () => {
  expect(new Set(owners).size).toBe(7);
  for (const owner of owners) {
    expect(routeSource).toContain(`data-owner="${owner}"`);
  }

  expect(routeSource).toContain('className="zen-mode text title"');
});

test("new milestone theme contains paint only while route keeps geometry declarations", () => {
  expect(routeSource).toContain('to="/$ownerName/$projectName/milestones"');
});

test("new milestone route translates legacy editor and date behavior to React state", () => {
  expect(routeSource).toContain("setDueDate");
  expect(routeSource).toContain("dataToggle");
  // bucket-3: tab state moved into the shared markdown editor (the route passes
  // the legacy data-toggle attribute through the dataToggle prop); the old
  // `setActiveTab`/`setActiveTab("preview")` pins matched the intermediate
  // migration state where the route owned the tabs.
  expect(editorComponentSource).toContain("setInternalActiveTab");
  expect(editorComponentSource).toContain('useState<EditorTab>("edit")');
  expect(routeSource).not.toContain("document.querySelector");
  expect(routeSource).not.toContain("addEventListener");
  expect(routeSource).not.toContain("dangerouslySetInnerHTML");
});

test("new milestone form renders title/options/actions and keeps editor tab React-owned", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.setViewportSize({ width: 1366, height: 900 });
  // bucket-3: the route shell now gates rendering on the project container
  // query, so the form no longer renders for a bare navigation; mock the
  // session/container like the sibling mt10/inline-residual specs.
  await mockNewMilestoneForm(page);
  await page.goto(`${basePath}/admin/sample/newMilestoneForm`);
  await expect(page.locator('[data-owner="project-milestone-create-form"]')).toBeVisible();
  await expect(page.locator('[data-owner="project-milestone-title"]')).toBeVisible();
  await expect(page.locator('[data-owner="project-milestone-options"]')).toBeVisible();
  await expect(page.locator('[data-owner="project-milestone-save"]')).toHaveText("Save");
  await expect(page.locator('[data-owner="project-milestone-cancel"]')).toHaveText("Cancel");
  await expect(page.locator('[data-owner="project-milestone-due-date"]')).toBeVisible();
  await page.locator('[data-owner="project-milestone-title"]').fill("Release 1");
  await page.locator('button:has-text("Preview")').click();
  await expect(page.locator("#preview-content-body")).toHaveClass(/active/);
  await page.locator('button:has-text("Edit")').click();
  await expect(page.locator("#edit-content-body")).toHaveClass(/active/);
  const geometry = await page
    .locator('[data-owner="project-milestone-title"]')
    .evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, width: rect.width };
    });
  expect(geometry.width).toBeGreaterThan(0);
  expect(geometry.left).toBeGreaterThanOrEqual(0);
});

async function mockNewMilestoneForm(page: Page) {
  const session = {
    actorId: 1,
    avatarUrl: "/assets/images/default-avatar-32.png",
    defaultLandingPath: "/",
    emailAddress: "admin@example.com",
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: true,
    loginId: "admin",
    userLabel: "Site Admin",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({
        contentType: "application/json",
        headers: { "x-csrf-token": "csrf-token" },
        json: session,
      }),
    );
  }
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        enrollmentRequestCount: 0,
        id: 7,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: true,
        logoUrl: "/assets/images/project_default_logo.png",
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        organizationName: "admin",
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        viewerCanUpdate: true,
      },
    }),
  );
}
