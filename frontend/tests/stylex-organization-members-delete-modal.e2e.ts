import { readFile } from "node:fs/promises";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = new URL(
  "../src/routes/organizations/$organizationName/members.tsx",
  import.meta.url,
);
const styleSource = new URL(
  "../src/routes/organizations/$organizationName/-members.stylex.ts",
  import.meta.url,
);
const legacySource = new URL(
  "../../yona-original/app/views/organization/members.scala.html",
  import.meta.url,
);

test("organization member delete modal uses conditional StyleX visibility", async ({ page }) => {
  const [route, style, legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);
  expect(legacy).toContain('id="alertDeletion"');
  expect(legacy).toContain('class="modal hide"');
  expect(route).toContain('data-stylex-owner="organization-members-delete-modal"');
  expect(route).toContain("deleteModalVisible: {");
  expect(route).not.toContain('style={deleteUserId === null ? undefined : { display: "block" }}');
  expect(style).not.toContain("globalColors");

  await mockMembers(page);
  await page.goto(`${basePath}/organizations/weblabs/members`);

  const modal = page.locator('[data-stylex-owner="organization-members-delete-modal"]');
  await expect(modal).toHaveClass("modal hide");
  await expect(modal).toHaveCSS("display", "none");
  await page.locator(".members.project button.ybtn-danger").first().click();
  await expect(modal).toHaveClass("modal hide in");
  await expect(modal).toBeVisible();
  await expect(modal).toHaveCSS("display", "block");
  await expect(modal).not.toHaveAttribute("style", /display/u);
  await expect(modal.locator(".modal-header h3")).toHaveText("Delete a group member");
  await expect(modal.locator(".modal-body p")).toHaveText(
    "Are you sure this user should leave this group?",
  );
  await expect(page.locator(".modal-backdrop.fade.in")).toHaveCount(1);
  await modal.locator(".modal-footer button:not(#deleteBtn)").click();
  await expect(modal).toHaveCSS("display", "none");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
});

async function mockMembers(page: Page) {
  const session = {
    actorId: 1,
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    userLabel: "Site Admin",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/organizations/weblabs/admin", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        deleteAllowed: true,
        enrollmentRequests: [],
        id: 42,
        logoUrl: "",
        members: [
          {
            avatarUrl: "/assets/images/default-avatar-64.png",
            loginId: "dev",
            role: "org_member",
            userId: 2,
            userLabel: "Dev Member",
          },
        ],
        organizationName: "weblabs",
        roleOptions: [{ label: "Group Member", role: "org_member" }],
        viewerCanUpdate: true,
      },
    }),
  );
}
