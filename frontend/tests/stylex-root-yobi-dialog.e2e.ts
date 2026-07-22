import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

const rootSource = new URL("../src/routes/__root.tsx", import.meta.url);
const legacySource = new URL(
  "../../yona-original/app/views/common/scripts.scala.html",
  import.meta.url,
);
const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.describe("StyleX root Yoram dialog", () => {
  test("owns the legacy confirmation row without changing its DOM contract", async () => {
    const [root, legacy] = await Promise.all([
      readFile(rootSource, "utf8"),
      readFile(legacySource, "utf8"),
    ]);

    expect(legacy).toContain('<div class="center-txt buttons">');
    expect(legacy).toContain('<button type="button" class="ybtn ybtn-info"');
    expect(legacy).toContain('@Messages("button.confirm")');
    expect(root).toContain("rootYoramDialogActionRow");
    expect(root).toContain('data-stylex-owner="root-yoram-dialog-action-row"');
    expect(root).toContain(
      "className={`${stylex.props(styles.rootYoramDialogActionRow).className} center-txt buttons`}",
    );
    expect(root).toContain("onClick={onDismiss}");
    expect(root).not.toContain('style={{ textAlign: "center" }}');
  });

  test("keeps the hidden root dialog stable and exposes the confirmation row when visible", async ({
    page,
  }) => {
    await page.goto(`${basePath}/`);

    const dialog = page.locator("#yobiDialog");
    const row = page.locator('[data-stylex-owner="root-yoram-dialog-action-row"]');
    const confirm = row.locator("button");

    await expect(dialog).toBeHidden();
    await expect(row).toHaveClass(/\bcenter-txt\b/);
    await expect(row).toHaveClass(/\bbuttons\b/);
    await expect(confirm).toHaveText(/Confirm|확인|確認/);

    // The root shell currently has no user-facing trigger for this global
    // legacy dialog. Make only the existing DOM state visible to verify its
    // browser-rendered owner and React-owned confirmation interaction.
    await dialog.evaluate((element) => {
      element.className = "modal yobiDialog in";
      element.setAttribute("aria-hidden", "false");
    });

    await expect(dialog).toBeVisible();
    await expect(row).toBeVisible();
    await expect(row).toHaveCSS("text-align", "center");
    await expect(confirm).toBeVisible();
    await confirm.click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("keeps the confirmation row centered at desktop and mobile widths", async ({ page }) => {
    for (const viewport of [
      { width: 1366, height: 900 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto(`${basePath}/`);

      const dialog = page.locator("#yobiDialog");
      const row = page.locator('[data-stylex-owner="root-yoram-dialog-action-row"]');
      const confirm = row.locator("button");
      await dialog.evaluate((element) => {
        element.className = "modal yobiDialog in";
        element.setAttribute("aria-hidden", "false");
      });

      const [dialogBox, rowBox, buttonBox] = await Promise.all([
        dialog.boundingBox(),
        row.boundingBox(),
        confirm.boundingBox(),
      ]);
      expect(dialogBox).not.toBeNull();
      expect(rowBox).not.toBeNull();
      expect(buttonBox).not.toBeNull();
      expect(rowBox!.x).toBeGreaterThanOrEqual(dialogBox!.x);
      expect(rowBox!.x + rowBox!.width).toBeLessThanOrEqual(dialogBox!.x + dialogBox!.width + 1);
      expect(buttonBox!.x + buttonBox!.width / 2).toBeCloseTo(rowBox!.x + rowBox!.width / 2, 0);
      expect(await row.evaluate((element) => getComputedStyle(element).textAlign)).toBe("center");
    }
  });
});
