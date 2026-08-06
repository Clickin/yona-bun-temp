import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (no-op); resolve builds those paths; fileURLToPath yields the served URL
// pathname so string mapping + .txt raw-suffix applies.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");
const fileURLToPath = (u: URL) => u.pathname;

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallbackOff = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1";
const screenshotDirectory = resolve(
  fileURLToPath(new URL("../", import.meta.url)),
  "output/playwright/stylex-project-pull-request-detail-help-messages-mt10",
  fallbackOff ? "fallback-off" : "normal",
);
const routeSource = readFileSync(
  fileURLToPath(
    new URL(
      "../src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber.tsx",
      import.meta.url,
    ),
  ),
  "utf8",
);
const styleSource = readFileSync(
  fileURLToPath(
    new URL(
      "../src/routes/$ownerName/$projectName/pullRequest/-pull-request-detail.stylex.ts",
      import.meta.url,
    ),
  ),
  "utf8",
);
const legacyRootSource = readFileSync(
  fileURLToPath(new URL("../../yona-original/app/views/git/view.scala.html", import.meta.url)),
  "utf8",
);
const legacyCommonSource = readFileSync(
  fileURLToPath(
    new URL("../../yona-original/app/assets/stylesheets/less/_common.less", import.meta.url),
  ),
  "utf8",
);
const legacyPageSource = readFileSync(
  fileURLToPath(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
  ),
  "utf8",
);
const legacyResponsiveSource = readFileSync(
  fileURLToPath(
    new URL("../../yona-original/app/assets/stylesheets/less/_responsive.less", import.meta.url),
  ),
  "utf8",
);
const legacyYobiSource = readFileSync(
  fileURLToPath(new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url)),
  "utf8",
);
const legacyBootstrapSource = readFileSync(
  fileURLToPath(new URL("../../yona-original/public/bootstrap/css/bootstrap.css", import.meta.url)),
  "utf8",
);
const legacyBootstrapResponsiveSource = readFileSync(
  fileURLToPath(
    new URL("../../yona-original/public/bootstrap/css/bootstrap-responsive.css", import.meta.url),
  ),
  "utf8",
);
const legacyMessagesSource = readFileSync(
  fileURLToPath(new URL("../../yona-original/conf/messages", import.meta.url)),
  "utf8",
);

test.use({ locale: "en-US" });

test("populated pull-request detail keeps help-message mt10 in StyleX", async ({ page }) => {
  expect(legacyRootSource).toContain('<div id="helpMessage" class="modal hide fade pullreq-info">');
  expect(legacyRootSource).toContain('<div class="right-txt">');
  expect(legacyRootSource).toContain('<a href="#helpMessage" class="ybtn ybtn-inverse ybtn-mini"');
  expect(legacyRootSource).toContain('<div class="pull-left help-messages mt10">');
  expect(legacyRootSource).toContain('<img class="img-polaroid"');
  expect(legacyRootSource).toContain('<div class="modal-footer">');
  expect(legacyRootSource).toContain('class="ybtn ybtn-info ybtn-small" data-dismiss="modal"');
  expect(legacyCommonSource).toContain(".mt10 { margin-top:10px; }");
  expect(legacyPageSource).toContain(".help-messages {");
  expect(legacyPageSource).toContain("margin-left: 10px;");
  expect(legacyPageSource).toContain("font-size: 120%;");
  for (const importedFile of [
    "_variables.less",
    "_mixins.less",
    "_common.less",
    "_sprites.less",
    "_page.less",
    "_tippy.less",
    "_scrollbar.less",
    "_responsive.less",
    "_yobiUI.less",
    "_temporary.less",
    "_markdown.less",
    "_migration.less",
    "_override.less",
  ]) {
    expect(legacyYobiSource).toContain(`@import "less/${importedFile}";`);
  }
  expect(legacyBootstrapSource).toContain(".img-polaroid {");
  expect(legacyBootstrapSource).toContain(".modal {");
  expect(legacyBootstrapSource).toContain(".modal-header {");
  expect(legacyBootstrapSource).toContain(".modal-body {");
  expect(legacyBootstrapSource).toContain(".modal-footer {");
  expect(legacyBootstrapResponsiveSource).toContain("@media (max-width: 767px)");
  expect(legacyBootstrapResponsiveSource).toContain("@media (max-width: 480px)");
  expect(legacyBootstrapResponsiveSource).toContain(".modal {");
  expect(legacyResponsiveSource).toContain(".modal {");
  expect(legacyMessagesSource).toContain(
    "pullRequest.merge.help.1 = You can check commits and descriptions on received code.",
  );
  expect(legacyMessagesSource).toContain(
    "pullRequest.merge.help.2 = If members of the original project accept the code, it will be merged into the original project.",
  );
  expect(legacyMessagesSource).toContain(
    "pullRequest.merge.help.3 = You can''t accept code if the code is not safe to merge.",
  );
  expect(legacyMessagesSource).toContain(
    "pullRequest.merge.help.4 = When you can''t accept code, you may postpone or delete the pull request.",
  );
  expect(legacyMessagesSource).toContain("title.help = Help");
  expect(legacyMessagesSource).toContain("button.confirm = Confirm");

  expect(styleSource).toContain('helpMessages: { marginTop: "10px" }');
  expect(routeSource).toContain(
    "const helpMessagesStyleProps = stylex.props(styles.helpMessages);",
  );
  expect(routeSource).toContain(
    'className={`${helpMessagesStyleProps.className ?? ""} pull-left help-messages mt10`.trim()}',
  );
  expect(routeSource).toContain('data-stylex-owner="pull-request-detail-help-messages"');
  expect(routeSource).not.toContain('style={{ marginTop: "10px" }}');
  expect(routeSource).not.toMatch(/<a\s/u);

  await mockPullRequestDetail(page);
  mkdirSync(screenshotDirectory, { recursive: true });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ] as const) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/pullRequest/9`, { waitUntil: "networkidle" });

    const helpActions = page.locator('[data-stylex-owner="pull-request-detail-help-actions"]');
    const trigger = helpActions.getByRole("button", { name: "Help" });
    const modal = page.locator('[data-stylex-owner="pull-request-detail-help-modal"]');
    const textColumn = page.locator('[data-stylex-owner="pull-request-detail-help-messages"]');
    await expect(helpActions).toBeVisible();
    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveClass(/\bybtn\b.*\bybtn-inverse\b.*\bybtn-mini\b/u);
    await expect(trigger).not.toHaveAttribute("data-toggle", /.+/u);
    await expect(modal).toBeHidden();
    await expect(modal).not.toHaveAttribute("aria-hidden", /.+/u);
    await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(
      fallbackOff ? 0 : 1,
    );

    await trigger.click();
    await expect(modal).toBeVisible();
    await expect(modal).toHaveClass(/\bmodal\b.*\bhide\b.*\bfade\b.*\bpullreq-info\b.*\bin\b/u);
    await expect(modal).toHaveAttribute("aria-hidden", "false");
    await expect(modal).toHaveAttribute("data-stylex-owner", "pull-request-detail-help-modal");
    // data-style-src is dev-only metadata (dist renders null; parity helper treats it as env-variant noise) — dropped in WTR copy.
    await expect(textColumn).toBeVisible();
    await expect(textColumn).toHaveClass(/\bpull-left\b/u);
    await expect(textColumn).toHaveClass(/\bhelp-messages\b/u);
    await expect(textColumn).toHaveClass(/\bmt10\b/u);
    await expect(textColumn).toHaveAttribute(
      "data-stylex-owner",
      "pull-request-detail-help-messages",
    );
    await expect(textColumn).toHaveCSS("margin-top", "10px");
    await expect(textColumn).not.toHaveAttribute("style", /.+/u);
    await expect(
      modal.locator("[data-toggle], [data-dismiss], [data-target], [data-backdrop]"),
    ).toHaveCount(0);
    await expect(
      helpActions.locator("[data-toggle], [data-dismiss], [data-target], [data-backdrop]"),
    ).toHaveCount(0);

    await expect(modal.locator(".modal-header, .modal-body, .modal-footer")).toHaveCount(3);
    await expect(modal.locator(".modal-header h5")).toHaveText(
      "You can check commits and descriptions on received code.",
    );
    await expect(modal.locator(".modal-body .row-fluid > .pull-left")).toHaveCount(2);
    const image = modal.locator(".modal-body img.img-polaroid");
    await expect(image).toHaveCount(1);
    if (!fallbackOff) {
      await expect(image).toBeVisible();
    }
    await expect(image).toHaveAttribute("alt", "");
    await expect(textColumn.locator("p")).toHaveText([
      "If members of the original project accept the code, it will be merged into the original project.",
      "You can't accept code if the code is not safe to merge.",
      "When you can't accept code, you may postpone or delete the pull request.",
    ]);
    await expect(modal.locator(".modal-footer button")).toHaveCount(1);
    await expect(modal.locator(".modal-footer button")).toHaveText("Confirm");
    await expect(modal.locator(".modal-footer button")).not.toHaveAttribute("data-dismiss", /.+/u);

    const evidence = await modal.evaluate((element) => {
      const body = element.querySelector<HTMLElement>(".modal-body");
      const row = element.querySelector<HTMLElement>(".modal-body .row-fluid");
      const imageColumn = row?.children.item(0) as HTMLElement | null;
      const text = element.querySelector<HTMLElement>(
        '[data-stylex-owner="pull-request-detail-help-messages"]',
      );
      const header = element.querySelector<HTMLElement>(".modal-header");
      const footer = element.querySelector<HTMLElement>(".modal-footer");
      const image = element.querySelector<HTMLImageElement>(".modal-body img.img-polaroid");
      const backdrop = document.querySelector<HTMLElement>(".modal-backdrop");
      if (!body || !row || !imageColumn || !text || !header || !footer || !image || !backdrop) {
        throw new Error("help modal geometry nodes are missing");
      }
      const modalBox = element.getBoundingClientRect();
      const bodyBox = body.getBoundingClientRect();
      const rowBox = row.getBoundingClientRect();
      const imageColumnBox = imageColumn.getBoundingClientRect();
      const imageBox = image.getBoundingClientRect();
      const textBox = text.getBoundingClientRect();
      const headerBox = header.getBoundingClientRect();
      const footerBox = footer.getBoundingClientRect();
      const backdropBox = backdrop.getBoundingClientRect();
      return {
        backdrop: {
          bottom: backdropBox.bottom,
          left: backdropBox.left,
          right: backdropBox.right,
          top: backdropBox.top,
        },
        body: {
          bottom: bodyBox.bottom,
          left: bodyBox.left,
          right: bodyBox.right,
          top: bodyBox.top,
        },
        children: [...element.children].map((child) => child.className),
        footer: {
          bottom: footerBox.bottom,
          left: footerBox.left,
          right: footerBox.right,
          top: footerBox.top,
        },
        header: {
          bottom: headerBox.bottom,
          left: headerBox.left,
          right: headerBox.right,
          top: headerBox.top,
        },
        image: {
          bottom: imageBox.bottom,
          columnRight: imageColumnBox.right,
          left: imageBox.left,
          right: imageBox.right,
          top: imageBox.top,
        },
        modal: {
          bottom: modalBox.bottom,
          left: modalBox.left,
          right: modalBox.right,
          top: modalBox.top,
          width: modalBox.width,
        },
        row: { bottom: rowBox.bottom, left: rowBox.left, right: rowBox.right, top: rowBox.top },
        text: {
          bottom: textBox.bottom,
          left: textBox.left,
          marginTop: getComputedStyle(text).marginTop,
          right: textBox.right,
          top: textBox.top,
        },
        viewport: { height: window.innerHeight, width: window.innerWidth },
      };
    });
    expect(evidence.children).toEqual(["modal-header", "modal-body", "modal-footer"]);
    expect(evidence.text.marginTop).toBe("10px");
    if (!fallbackOff) {
      expect(evidence.modal.left).toBeGreaterThanOrEqual(0);
      expect(evidence.modal.right).toBeLessThanOrEqual(evidence.viewport.width + 1);
      expect(evidence.modal.top).toBeGreaterThanOrEqual(0);
    }
    expect(evidence.modal.bottom).toBeGreaterThan(evidence.modal.top);
    expect(evidence.header.left).toBeGreaterThanOrEqual(evidence.modal.left);
    expect(evidence.header.right).toBeLessThanOrEqual(evidence.modal.right);
    expect(evidence.body.left).toBeGreaterThanOrEqual(evidence.modal.left);
    expect(evidence.body.right).toBeLessThanOrEqual(evidence.modal.right);
    expect(evidence.footer.left).toBeGreaterThanOrEqual(evidence.modal.left);
    expect(evidence.footer.right).toBeLessThanOrEqual(evidence.modal.right);
    if (!fallbackOff) {
      expect(evidence.image.left).toBeGreaterThanOrEqual(evidence.body.left);
      expect(evidence.image.right).toBeLessThanOrEqual(evidence.body.right + 1);
      expect(evidence.image.top).toBeGreaterThanOrEqual(evidence.body.top);
      expect(evidence.image.bottom).toBeLessThanOrEqual(evidence.body.bottom + 1);
    }
    expect(evidence.text.left).toBeGreaterThanOrEqual(evidence.body.left);
    expect(evidence.text.right).toBeLessThanOrEqual(evidence.body.right + 1);
    expect(evidence.text.top).toBeGreaterThanOrEqual(evidence.row.top);
    expect(evidence.text.bottom).toBeLessThanOrEqual(evidence.body.bottom + 1);
    expect(evidence.row.left).toBeGreaterThanOrEqual(evidence.body.left);
    expect(evidence.row.right).toBeLessThanOrEqual(evidence.body.right + 1);
    if (!fallbackOff) {
      expect(evidence.backdrop).toEqual({
        bottom: evidence.viewport.height,
        left: 0,
        right: evidence.viewport.width,
        top: 0,
      });
    }
    if (viewport.width >= 480) {
      expect(evidence.modal.width).toBeGreaterThan(500);
      expect(
        Math.abs((evidence.modal.left + evidence.modal.right) / 2 - viewport.width / 2),
      ).toBeLessThanOrEqual(2);
    }
    expect(evidence.viewport.width).toBe(viewport.width);
    expect(evidence.viewport.height).toBe(viewport.height);
    expect(
      await page.evaluate(() =>
        Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      ),
    ).toBeLessThanOrEqual(viewport.width + 1);

    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}-open.png`),
    });

    if (fallbackOff) {
      await modal
        .locator(".modal-footer button")
        .evaluate((button) => (button as HTMLButtonElement).click());
    } else {
      await modal.locator(".modal-footer button").click();
    }
    await expect(modal).toBeHidden();
    await expect(modal).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator(".modal-backdrop")).toHaveCount(0);
    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}-closed-confirm.png`),
    });

    await trigger.click();
    await expect(modal).toBeVisible();
    if (!fallbackOff) {
      await page.locator(".modal-backdrop").click({ position: { x: 1, y: 1 } });
      await expect(modal).toBeHidden();
      await expect(modal).toHaveAttribute("aria-hidden", "true");
      await expect(page.locator(".modal-backdrop")).toHaveCount(0);
    }
  }
});

async function mockPullRequestDetail(page: Page) {
  const avatarUrl = `${basePath}/legacy-assets/images/default-avatar-34.png`;
  const session = {
    actorId: 1,
    avatarUrl,
    defaultLandingPath: "/",
    emailAddress: "admin@example.com",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "en",
    userLabel: "Site Admin",
  };
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en"],
    };
  }, basePath);
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        isUsingReviewerCount: false,
        viewerCanUpdate: true,
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/pull-requests/9", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        attachments: [],
        bodyMarkdown: "Pull request body",
        commits: [],
        conflict: false,
        contributor: { avatarUrl, loginId: "dev", userId: 2, userLabel: "Dev Member" },
        createdLabel: "Jul 2, 2026",
        events: [],
        fromBranch: "feature/ui",
        fromOwnerName: "admin",
        fromProjectName: "sample",
        id: 9,
        isMerging: false,
        isWatching: false,
        lackingReviewerCount: 0,
        mergedCommitIdFrom: "",
        mergedCommitIdTo: "",
        ownerName: "admin",
        permissions: {
          canComment: true,
          canDeleteSourceBranch: false,
          canRead: true,
          canReadChanges: true,
          canReview: false,
          canRestoreSourceBranch: false,
          canUpdate: true,
          canUpdateState: true,
          canWatch: true,
        },
        projectName: "sample",
        pullRequestNumber: 9,
        receiver: { avatarUrl, loginId: "admin", userId: 1, userLabel: "Site Admin" },
        requiredReviewerCount: 0,
        reviewed: false,
        reviewers: [],
        sourceBranchExists: true,
        state: "open",
        threads: [],
        title: "Improve docs",
        toBranch: "main",
        updatedLabel: "Jul 2, 2026",
        watcherCount: 0,
      },
    }),
  );
}
