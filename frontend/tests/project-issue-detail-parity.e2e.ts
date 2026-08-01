import { expect, test } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

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
