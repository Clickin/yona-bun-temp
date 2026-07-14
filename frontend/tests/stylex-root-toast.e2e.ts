import { expect, test } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const frontendRoot = path.resolve(import.meta.dirname, "..");
const rootRoutePath = path.join(frontendRoot, "src/routes/__root.tsx");
const themePath = path.join(frontendRoot, "src/theme.stylex.ts");

const toastOwner = '[data-stylex-owner="root-yoram-toast"]';
const toastContainerOwner = '[data-stylex-owner="root-toast-container"]';
const toastSelector = toastOwner;
const dismissSelector = `${toastOwner} [data-stylex-part="toast-dismiss"]`;
const dismissButtonSelector = `${dismissSelector} button`;
const messageSelector = `${toastOwner} [data-stylex-part="toast-message"]`;

test.describe("RootYoramToast StyleX ownership", () => {
  test("declares a stable React-owned StyleX boundary with global theme tokens", async () => {
    const [routeSource, themeSource] = await Promise.all([
      fs.readFile(rootRoutePath, "utf8"),
      fs.readFile(themePath, "utf8"),
    ]);

    expect(routeSource).toContain('data-stylex-owner="root-yoram-toast"');
    expect(routeSource).toContain('data-stylex-part="toast"');
    expect(routeSource).toContain('data-stylex-part="toast-dismiss"');
    expect(routeSource).toContain('data-stylex-part="toast-message"');
    expect(routeSource).toMatch(/stylex\.props\(styles\.rootToast\)/);

    for (const token of [
      "rootYoramToastSurface",
      "rootYoramToastRadius",
      "rootYoramToastShadow",
      "rootYoramToastPadding",
      "rootYoramToastFontSize",
      "rootYoramToastFontWeight",
      "rootYoramToastDismissColor",
      "rootYoramToastDismissFontSize",
      "rootYoramToastDismissFontWeight",
      "rootYoramToastMessageFontSize",
      "rootYoramToastMessageWidth",
    ]) {
      expect(themeSource).toContain(`${token}:`);
      expect(routeSource).toContain(`globalColors.${token}`);
    }
  });

  test("shows the legacy-visible signup-requested toast and dismisses on click", async ({
    page,
  }) => {
    await page.goto("/?signup=requested");

    const toast = page.locator(toastSelector);
    await expect(toast).toBeVisible();
    await expect(toast).toContainText(
      "Sign-up request has been sent. Site admin will review and accept your request. Thanks.",
    );
    await expect(page.locator(dismissButtonSelector)).toBeVisible();
    await expect(page.locator(dismissButtonSelector)).toHaveAttribute("type", "button");
    await expect(page.locator(messageSelector)).toHaveText(
      "Sign-up request has been sent. Site admin will review and accept your request. Thanks.",
    );
    await expect(toast).not.toHaveClass(/\btoast\b/);
    await expect(page.locator(dismissSelector)).not.toHaveClass(/\bbtn-dismiss\b/);
    await expect(page.locator(dismissButtonSelector)).not.toHaveClass(/\bbtn-transparent\b/);

    await page.locator(dismissButtonSelector).click();
    await expect(toast).toBeHidden();
  });

  test("dismisses after the React-owned timeout", async ({ page }) => {
    await page.clock.install();
    await page.goto("/?signup=requested");

    const toast = page.locator(toastSelector);
    await expect(toast).toBeVisible();
    await page.clock.runFor(10_000);
    await expect(toast).toBeHidden();
  });

  test("matches desktop legacy toast geometry and paint", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto("/?signup=requested");

    const [toast, container, dismiss, button, message] = await Promise.all([
      page.locator(toastSelector),
      page.locator(toastContainerOwner),
      page.locator(dismissSelector),
      page.locator(dismissButtonSelector),
      page.locator(messageSelector),
    ]);
    await expect(toast).toBeVisible();

    await page.screenshot({
      path: path.resolve(frontendRoot, "../output/playwright/stylex-root-toast-desktop.png"),
    });
    await expect(toast).toHaveScreenshot("stylex-root-toast-desktop.png");
    await expect(toast).toHaveCSS("background-color", "rgb(205, 220, 57)");
    await expect(toast).toHaveCSS("border-radius", "2px");
    await expect(toast).toHaveCSS("box-shadow", "rgb(0, 0, 0) 1px 1px 3px 0px");
    await expect(toast).toHaveCSS("opacity", "1");
    await expect(toast).toHaveCSS("padding", "10px 20px");
    await expect(toast).toHaveCSS("font-size", "13px");
    await expect(toast).toHaveCSS("font-weight", "700");
    await expect(button).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(button).toHaveCSS("border-top-style", "none");
    await expect(button).toHaveCSS("font-size", "25px");
    await expect(button).toHaveCSS("font-weight", "700");
    await expect(button).toHaveCSS("color", "rgb(0, 0, 0)");
    await expect(message).toHaveCSS("font-size", "15px");
    await expect(message).toHaveCSS("width", "369px");
    await expect(message).toHaveCSS("margin-top", "0px");

    await expect(container).toHaveJSProperty("offsetWidth", 470);
    await expect(container).toHaveJSProperty("offsetHeight", 90);
    await expect(toast).toHaveJSProperty("offsetWidth", 450);
    await expect(toast).toHaveJSProperty("offsetHeight", 70);
    await expect(dismiss).toHaveJSProperty("offsetWidth", 16);
    await expect(button).toHaveJSProperty("offsetWidth", 16);

    await expect(
      await container.evaluate((element) => element.getBoundingClientRect().x),
    ).toBeCloseTo(866);
    await expect(
      await container.evaluate((element) => element.getBoundingClientRect().y),
    ).toBeCloseTo(775);
    await expect(await toast.evaluate((element) => element.getBoundingClientRect().x)).toBeCloseTo(
      876,
    );
    await expect(await toast.evaluate((element) => element.getBoundingClientRect().y)).toBeCloseTo(
      785,
    );
    await expect(
      await dismiss.evaluate((element) => element.getBoundingClientRect().x),
    ).toBeCloseTo(1296);
    await expect(await button.evaluate((element) => element.getBoundingClientRect().x)).toBeCloseTo(
      1296,
    );
  });

  test("preserves mobile clipping and geometry", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/?signup=requested");

    const [toast, container, dismiss, button] = await Promise.all([
      page.locator(toastSelector),
      page.locator(toastContainerOwner),
      page.locator(dismissSelector),
      page.locator(dismissButtonSelector),
    ]);
    await expect(toast).toBeVisible();
    await page.screenshot({
      path: path.resolve(frontendRoot, "../output/playwright/stylex-root-toast-mobile.png"),
    });
    await expect(toast).toHaveScreenshot("stylex-root-toast-mobile.png");

    await expect(container).toHaveJSProperty("offsetWidth", 470);
    await expect(container).toHaveJSProperty("offsetHeight", 90);
    await expect(toast).toHaveJSProperty("offsetWidth", 450);
    await expect(toast).toHaveJSProperty("offsetHeight", 70);
    await expect(
      await container.evaluate((element) => element.getBoundingClientRect().x),
    ).toBeCloseTo(-110);
    await expect(
      await container.evaluate((element) => element.getBoundingClientRect().y),
    ).toBeCloseTo(719);
    await expect(await toast.evaluate((element) => element.getBoundingClientRect().x)).toBeCloseTo(
      -100,
    );
    await expect(await toast.evaluate((element) => element.getBoundingClientRect().y)).toBeCloseTo(
      729,
    );
    await expect(
      await dismiss.evaluate((element) => element.getBoundingClientRect().x),
    ).toBeCloseTo(320);
    await expect(
      await dismiss.evaluate((element) => element.getBoundingClientRect().y),
    ).toBeCloseTo(734);
    await expect(await button.evaluate((element) => element.getBoundingClientRect().x)).toBeCloseTo(
      320,
    );
    await expect(await button.evaluate((element) => element.getBoundingClientRect().y)).toBeCloseTo(
      735.5,
    );
  });
});
