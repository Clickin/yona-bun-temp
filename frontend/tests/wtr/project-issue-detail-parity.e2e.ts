// e2e closure ledger (2026-08-13): both tests need the real-data mirror
// backend (admin/WYVE_OCS issues 3967/3964). The WTR dev server 404s every
// /yona/api/* path, so the app cannot render the issue body — no route change
// can fix an unavailable API. Skip when the live legacy origin is unreachable
// (HARNESS_ENV live-data dependency; same pattern as
// project-issues-real-instance-parity.e2e.ts ledger 2026-08-12).
import { expect, test } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const legacyOrigin = process.env.YONA_LEGACY_ORIGIN ?? "http://192.168.45.20:9000";

const mirrorSkipMessage =
  "requires a legacy-data mirror backend containing admin/WYVE_OCS; point YONA_LEGACY_ORIGIN at a mirror or seed the parity fixture";

// ponytail: one cached probe against the LIVE legacy backend; the WTR proxy
// owns mirror routing. The local app API always 404s in the WTR harness, so
// the probe must target the legacy origin (unreachable in CI -> skip).
const mirrorProbe = (async () => {
  try {
    const response = await fetch(`${legacyOrigin}${basePath}/admin/WYVE_OCS/issue/3967`, {
      signal: AbortSignal.timeout(3000),
    });
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
  expect(await mirrorProbe).toBe(true);
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

test("live issue 3964 non-destructive controls own focus, visibility, and modal state", async ({
  page,
}) => {
  expect(await mirrorProbe).toBe(true);
  await page.goto(`${basePath}/admin/WYVE_OCS/issue/3964`);
  await expect(page.locator("#issue-body-3964 .content.markdown-wrap")).toBeVisible();

  const keymapButton = page.locator('[data-owner="issue-detail-keymap-wrapper"] > button');
  await keymapButton.click();
  await expect(page.locator("#helpKeys")).toHaveClass(/in/u);
  await expect(page.locator("#helpKeys")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#helpKeys")).toHaveClass(/hide/u);

  const shareButton = page.locator("#issue-share-button");
  if ((await shareButton.count()) > 0) {
    await shareButton.click();
    await expect(page.locator("#sharer-list")).toBeVisible();
    const sharerInput = page.getByRole("textbox", { name: /Issue Sharer/u });
    await sharerInput.focus();
    await expect(sharerInput).toBeFocused();
    await sharerInput.press("Escape");
    await expect(page.locator("#sharer-list .select2-drop")).toHaveCount(0);
  }

  const deleteButton = page.locator(
    '[data-owner="project-issue-detail-action-delete"]:not(.disabled)',
  );
  if ((await deleteButton.count()) > 0) {
    await deleteButton.first().click();
    await expect(page.locator("#deleteConfirm")).toHaveClass(/in/u);
    await expect(page.locator("#deleteConfirm")).toBeFocused();
    await page.locator("#deleteConfirm .modal-footer .ybtn:not(.ybtn-danger)").click();
    await expect(page.locator("#deleteConfirm")).toHaveClass(/hide/u);
    await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  }

  const editableComment = page.locator(
    '.span-left-pane .comment [data-owner="project-issue-detail-comment-action-edit"]',
  );
  if ((await editableComment.count()) > 0) {
    const comment = editableComment
      .first()
      .locator("xpath=ancestor::li[contains(@class,'comment')]");
    await editableComment.first().click();
    await expect(comment.locator(".comment-update-form")).toBeVisible();
    await comment.locator(".comment-update-form .ybtn-cancel").click();
    await expect(comment.locator(".comment-update-form")).toBeHidden();
  }

  const reply = page.locator(".span-left-pane .comment .add-a-comment").first();
  if ((await reply.count()) > 0) {
    await reply.click();
    const replyForm = reply
      .locator("xpath=following-sibling::*[1]")
      .locator(".child-comment-input-form");
    await expect(replyForm).toBeVisible();
    await replyForm.locator("textarea").press("Escape");
    await expect(replyForm).toBeHidden();
  }
});
