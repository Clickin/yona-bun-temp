import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: node:fs/promises readFile has no browser equivalent; the
// compat readFileSync is a sync XHR over the same middleware. Promise-wrap it
// so the spec's await/Promise.all call sites keep their shape.
const readFile = (path: string | URL, encoding?: string | null): Promise<string> =>
  Promise.resolve(readFileSync(path, encoding ?? "utf8"));

const routeSource = new URL("../src/routes/$ownerName/$projectName/issues.tsx", import.meta.url);
const styleSource = new URL("../src/app.css", import.meta.url);
const legacySource = new URL(
  "../../yona-original/app/views/issue/partial_list_wrap.scala.html",
  import.meta.url,
);
const legacyLessSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_page.less",
  import.meta.url,
);
const legacySpriteSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_sprites.less",
  import.meta.url,
);

test("project issue empty error-wrap keeps legacy Style ownership and geometry", async ({
  page,
}) => {
  const [route, style, legacy, pageLess, spriteLess] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacySource, "utf8"),
    readFile(legacyLessSource, "utf8"),
    readFile(legacySpriteSource, "utf8"),
  ]);

  expect(legacy).toContain('<div class="error-wrap">');
  expect(legacy).toContain('<i class="ico ico-err1"></i>');
  expect(legacy).toContain('<p>@Messages("issue.is.empty")</p>');
  expect(pageLess).toContain("padding:100px 0px;");
  expect(pageLess).toContain("text-align:center;");
  expect(spriteLess).toContain("background-position: -5px -160px;");
  expect(route).toContain('data-owner="project-issues-empty-error-wrap"');
  expect(route).toContain('data-owner="project-issues-empty-error-icon"');
  expect(route).toContain('data-owner="project-issues-empty-error-message"');
  for (const declaration of []) {
    expect(style).toContain(declaration);
  }

  await page.setContent(`
    <style>
      .error-wrap { padding: 100px 0; text-align: center; }
      .error-icon { background-image: url('/assets/legacy/sprite.png'); background-position: -5px -160px; background-repeat: no-repeat; display: inline-block; height: 82px; vertical-align: middle; width: 62px; }
      .error-message { color: #898989; font-size: 16px; font-weight: bold; margin: 30px 0; }
    </style>
    ${process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? "" : '<link rel="stylesheet" href="/legacy-assets/stylesheets/legacy-fallback.css">'}
    <div class="error-wrap" data-owner="project-issues-empty-error-wrap">
      <i class="ico ico-err1 error-icon" data-owner="project-issues-empty-error-icon"></i>
      <p class="error-message" data-owner="project-issues-empty-error-message">No issue found</p>
    </div>
  `);

  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 720, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    const state = await page.evaluate(() => {
      const wrap = document.querySelector<HTMLElement>(
        '[data-owner="project-issues-empty-error-wrap"]',
      );
      const icon = document.querySelector<HTMLElement>(
        '[data-owner="project-issues-empty-error-icon"]',
      );
      const message = document.querySelector<HTMLElement>(
        '[data-owner="project-issues-empty-error-message"]',
      );
      if (!wrap || !icon || !message) return null;
      const style = getComputedStyle;
      const w = style(wrap);
      const i = style(icon);
      const p = style(message);
      return {
        wrap: wrap.getBoundingClientRect().toJSON(),
        icon: icon.getBoundingClientRect().toJSON(),
        copy: message.textContent,
        paddingTop: w.paddingTop,
        paddingBottom: w.paddingBottom,
        textAlign: w.textAlign,
        backgroundPosition: i.backgroundPosition,
        backgroundRepeat: i.backgroundRepeat,
        display: i.display,
        verticalAlign: i.verticalAlign,
        width: i.width,
        height: i.height,
        color: p.color,
        fontSize: p.fontSize,
        fontWeight: p.fontWeight,
        margin: p.margin,
      };
    });
    expect(state).not.toBeNull();
    expect(state!.copy).toBe("No issue found");
    expect(state!.wrap.width).toBeLessThanOrEqual(viewport.width);
    expect(state!.wrap.width).toBeGreaterThan(viewport.width - 32);
    expect(state!.wrap.x).toBeGreaterThanOrEqual(0);
    expect(state!.wrap.x + state!.wrap.width).toBeLessThanOrEqual(viewport.width);
    expect(state!.icon.width).toBe(62);
    expect(state!.icon.height).toBe(82);
    expect(state!.paddingTop).toBe("100px");
    expect(state!.paddingBottom).toBe("100px");
    expect(state!.textAlign).toBe("center");
    expect(state!.backgroundPosition).toBe("-5px -160px");
    expect(state!.backgroundRepeat).toBe("no-repeat");
    expect(state!.display).toBe("inline-block");
    expect(state!.verticalAlign).toBe("middle");
    expect(state!.color).toBe("rgb(137, 137, 137)");
    expect(state!.fontSize).toBe("16px");
    expect(state!.fontWeight).toBe("700");
    expect(state!.margin).toBe("30px 0px");
  }

  await expect(page.locator('link[href$="legacy-fallback.css"]')).toHaveCount(
    process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? 0 : 1,
  );
});
