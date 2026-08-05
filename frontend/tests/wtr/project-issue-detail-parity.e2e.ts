import { expect, test } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

const mirrorSkipMessage =
  "requires a legacy-data mirror backend containing admin/WYVE_OCS; point YONA_E2E_BACKEND_ORIGIN at a mirror or seed the parity fixture";

// ponytail: one cached probe; the mirror backend is the file-wide precondition, assertions stay untouched
const mirrorProbe = (async () => {
  const backendOrigin = process.env.YONA_E2E_BACKEND_ORIGIN ?? "http://127.0.0.1:8089";
  try {
    const response = await fetch(
      `${backendOrigin}${basePath}/api/v1/projects/admin/WYVE_OCS/issues?state=closed&orderBy=updatedDate&orderDir=desc&pageNum=1`,
    );
    return response.status === 200;
  } catch {
    return false;
  }
})();

test.beforeEach(async () => {
  if (!(await mirrorProbe)) {
    test.skip(true, mirrorSkipMessage);
  }
});

test("issue task progress and XML comments match legacy rendering", async ({ page }) => {
  await page.goto(`${basePath}/admin/WYVE_OCS/issue/3967`);
  const body = page.locator("#issue-body-3967 .content.markdown-wrap");
  await expect(body).toBeVisible();

  const tasklist = page.locator("#issue-body-3967 .tasklist");
  await expect(tasklist).toHaveClass(/task-show/);
  await expect(tasklist.locator(".done-counter")).toHaveText("(0/2)");
  await expect(tasklist.locator(".bar")).toHaveClass(/red/);
  await expect(tasklist.locator(".bar")).toHaveAttribute("style", /--x-width: 0%/);
  await expect(body).not.toContainText("Sample: 외래원무팀");
});
