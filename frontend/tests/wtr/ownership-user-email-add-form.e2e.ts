import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = resolve("../output/playwright/visual-sweep");
const owners = {
  action: "user-email-add-action",
  form: "user-email-add-form",
  input: "user-email-add-input",
} as const;
const owner = (page: Page, name: string) => page.locator(`[data-owner="${name}"]`);

test.use({ locale: "ko-KR" });

test("records the legacy add-email evidence and exact three-owner Style boundary", () => {
  const route = readFileSync("src/routes/user/editform/emails.tsx", "utf8");
  const template = readFileSync("../yona-original/app/views/user/edit_emails.scala.html", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const responsive = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const yobiUi = readFileSync("../yona-original/app/assets/stylesheets/less/_yobiUI.less", "utf8");

  expect(template).toContain(
    '<form action="@routes.UserApp.addEmail" method="post" class="form-inline inner-bubble">',
  );
  expect(template).toContain('class="text uname"');
  expect(template).toContain('class="ybtn ybtn-success"');
  expect(pageLess).toContain(".inner-bubble {");
  expect(pageLess).toContain("width: 384px;");
  expect(responsive).toContain(".inner-bubble .text.uname {");
  expect(responsive).toContain("width: inherit !important;");
  expect(yobiUi).toContain("&.ybtn-success");

  for (const name of Object.values(owners)) expect(route).toContain(`data-owner="${name}"`);
  expect(route).not.toContain('className="form-inline inner-bubble"');
  expect(route).not.toContain('className="text uname"');
  expect(route).not.toContain('className="ybtn ybtn-success"');
});

for (const viewport of [
  { height: 900, inputWidth: 398, name: "desktop", width: 1366 },
  { height: 844, inputWidth: 187, name: "mobile", width: 390 },
] as const)
  test(`pins the ${viewport.name} legacy add-email styles, geometry, interaction, and screenshot`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    let submittedEmail = "";
    await mockEmailSettings(page, (email) => {
      submittedEmail = email;
    });
    await page.goto(`${basePath}/user/editform/emails`);
    await page.evaluate(() => document.fonts.ready);

    const form = owner(page, owners.form);
    const input = owner(page, owners.input);
    const action = owner(page, owners.action);
    await expect(form).toBeVisible();
    await expect(input).toHaveAttribute("placeholder", "새 이메일 주소");
    await expect(action).toHaveText("추가");
    await expect(form).not.toHaveClass(/\b(?:form-inline|inner-bubble)\b/u);
    await expect(input).not.toHaveClass(/\b(?:text|uname)\b/u);
    await expect(action).not.toHaveClass(/\b(?:ybtn|ybtn-success)\b/u);

    await expect(form).toHaveCSS("display", "block");
    await expect(form).toHaveCSS("margin", "0px 0px 10px");
    await expect(form).toHaveCSS("position", "relative");
    await expect(input).toHaveCSS("box-sizing", "content-box");
    await expect(input).toHaveCSS("height", "20px");
    await expect(input).toHaveCSS("padding", "4px 6px");
    await expect(input).toHaveCSS("margin", "0px");
    await expect(input).toHaveCSS("font-size", viewport.name === "mobile" ? "16px" : "12px");
    await expect(input).toHaveCSS("line-height", "20px");
    await expect(input).toHaveCSS("color", "rgb(85, 85, 85)");
    await expect(input).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(input).toHaveCSS("border", "1px solid rgb(204, 204, 204)");
    await expect(input).toHaveCSS("border-radius", "2px");
    await expect(input).toHaveCSS("box-shadow", "none");
    await expect(action).toHaveCSS("height", "30px");
    await expect(action).toHaveCSS("padding", "4px 12px");
    await expect(action).toHaveCSS("margin", "0px 0px 0px 4.2px");
    await expect(action).toHaveCSS("font-size", "14px");
    await expect(action).toHaveCSS("line-height", "20px");
    await expect(action).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(action).toHaveCSS("background-color", "rgb(255, 115, 50)");
    await expect(action).toHaveCSS("border", "1px solid rgb(233, 94, 1)");
    await expect(action).toHaveCSS("border-radius", "3px");

    // F5 dist-truth: the rects settle a beat after the style asserts under
    // shard load, and the add-form surface can briefly re-render — poll the
    // full geometry contract with an explicit 30s window, tolerating the
    // transient absence of owner nodes.
    let geometryOk = false;
    {
      const deadline = Date.now() + 30000;
      while (Date.now() < deadline) {
        try {
          const boxes = await page.evaluate((names) => {
            const box = (name: string) => {
              const node = document.querySelector<HTMLElement>(`[data-owner="${name}"]`);
              if (!node) return null;
              const rect = node.getBoundingClientRect();
              return { height: rect.height, left: rect.left, top: rect.top, width: rect.width };
            };
            return { action: box(names.action), form: box(names.form), input: box(names.input) };
          }, owners);
          if (
            boxes.form &&
            boxes.input &&
            boxes.action &&
            boxes.form.height === 30 &&
            boxes.input.height === 30 &&
            boxes.input.left === boxes.form.left &&
            boxes.input.top === boxes.form.top &&
            boxes.input.width === viewport.inputWidth &&
            boxes.action.height === 30 &&
            boxes.action.top === boxes.form.top &&
            Math.abs(boxes.action.left - boxes.input.left - boxes.input.width - 7.78125) < 0.0001
          ) {
            geometryOk = true;
            break;
          }
        } catch {
          // transient evaluate errors — keep polling
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
    expect(geometryOk).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);

    mkdirSync(screenshotDirectory, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `style-user-email-add-form-${viewport.name}.png`),
    });

    await input.focus();
    // e2e closure ledger (2026-08-11): classified HARNESS_ENV — the :focus
    // border-color pin measured the unfocused state (rgb(204,204,204)) in the WTR
    // iframe; the committed app.css:20356 :focus rule resolves to rgb(243, 108, 34).
    // Re-focus under shard load: a late re-render can blur the input after the
    // initial focus, so poll the focused paint (gate flake: border stayed #ccc).
    // Use the native focus() (the harness focus dispatches a synthetic focusin
    // first, which the app's re-render can clear).
    await expect
      .poll(async () => {
        // Re-focus + settle the 0.2s border transition inside each iteration:
        // a late re-render can blur the input, and re-focus restarts the
        // transition — reading immediately after focus() can catch the start
        // value forever under shard load.
        await input.evaluate((element) => {
          (element as HTMLInputElement).focus();
        });
        await new Promise((resolve) => setTimeout(resolve, 300));
        return input.evaluate((element) => getComputedStyle(element).borderColor);
      })
      .toBe("rgb(243, 108, 34)");
    await expect(input).toHaveCSS("box-shadow", "none");
    await action.hover();
    await expect(action).toHaveCSS("background-color", "rgb(233, 94, 1)");
    await input.fill("new@example.com");
    await action.click();
    await expect.poll(() => submittedEmail).toBe("new@example.com");
    await expect(input).toHaveValue("");
  });

async function mockEmailSettings(page: Page, onAdd: (email: string) => void) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      feedbackUrl: "https://github.com/yona-projects/yona/issues",
      hideProjectListing: false,
      siteName: "Yoram",
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  const session = {
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "ko-KR",
  };
  const fulfillSession = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-token" },
      json: session,
    });
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, fulfillSession);
  await page.route("**/api/v1/workspace", (route) =>
    route.fulfill({ contentType: "application/json", json: workspaceBody() }),
  );
  await page.route("**/api/v1/workspace/emails", async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().headers()["x-csrf-token"]).toBeDefined();
    const body = JSON.parse(route.request().postData() ?? "{}") as { email?: string };
    onAdd(body.email ?? "");
    await route.fulfill({ contentType: "application/json", json: workspaceBody() });
  });
}

function workspaceBody() {
  return {
    emails: [],
    favoriteProjects: [],
    issueItems: [],
    memberProjects: [],
    profile: {
      avatarUrl: "/assets/images/default-avatar-128.png",
      displayName: "Admin User",
      loginId: "admin",
      primaryEmailAddress: "admin@example.com",
    },
    pullRequestItems: [],
    recentProjects: [],
    watchedProjects: [],
  };
}
