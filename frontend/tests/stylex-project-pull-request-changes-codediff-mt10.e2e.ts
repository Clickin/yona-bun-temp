import { mkdirSync, readFileSync } from "node:fs";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const changesPath = `${basePath}/admin/sample/pullRequest/9/changes`;
const screenshotDirectory = "/private/tmp/yona-pull-request-changes-codediff-mt10";
const routeSource = readFileSync(
  new URL(
    "../src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes.tsx",
    import.meta.url,
  ),
  "utf8",
);
const styleSource = readFileSync(
  new URL(
    "../src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/-pull-request-changes.stylex.ts",
    import.meta.url,
  ),
  "utf8",
);
const legacyViewSource = readFileSync(
  new URL("../../yona-original/app/views/git/viewChanges.scala.html", import.meta.url),
  "utf8",
);
const legacyCommonSource = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_common.less", import.meta.url),
  "utf8",
);
const legacyPageSource = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
  "utf8",
);
const legacyResponsiveSource = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_responsive.less", import.meta.url),
  "utf8",
);
const legacyYobiSource = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
  "utf8",
);
const legacyBootstrapSource = readFileSync(
  new URL("../../yona-original/public/bootstrap/css/bootstrap.css", import.meta.url),
  "utf8",
);
const legacyBootstrapResponsiveSource = readFileSync(
  new URL("../../yona-original/public/bootstrap/css/bootstrap-responsive.css", import.meta.url),
  "utf8",
);
const legacyMessagesSource = readFileSync(
  new URL("../../yona-original/conf/messages", import.meta.url),
  "utf8",
);

test("pull-request changes keeps the legacy codediff mt10 wrapper owned by StyleX", () => {
  expect(legacyViewSource).toContain(
    'class="codediff-wrap mt10 @if(pull.commentThreads.size == 0) {diffs-only}"',
  );
  expect(legacyCommonSource).toContain(".mt10 { margin-top:10px; }");
  expect(legacyPageSource).toContain(".codediff-wrap {");
  expect(legacyPageSource).toContain("&.diffs-only {");
  expect(legacyPageSource).toContain(".diffs-wrap { width:100%; }");
  expect(legacyResponsiveSource).toContain(".codediff-wrap {");
  expect(legacyResponsiveSource).toContain("margin-right: inherit !important;");
  expect(legacyResponsiveSource).toContain("position: inherit !important;");
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
  expect(legacyBootstrapSource).toContain(".btn {");
  expect(legacyBootstrapSource).toContain(".dropdown-menu {");
  expect(legacyBootstrapResponsiveSource).toMatch(/@media[^\n{]*max-width/iu);
  expect(legacyMessagesSource).toMatch(/^pullRequest\.changes\.all\s*=/mu);
  expect(legacyMessagesSource).toMatch(/^review\.outdated\s*=/mu);

  expect(styleSource).toContain('codediffWrap: { marginTop: "10px" }');
  expect(routeSource).toContain("...sx.codediffWrap");
  expect(routeSource).toContain('data-stylex-owner="pull-request-changes-codediff-wrap"');
  expect(routeSource).toContain(
    'className={`${codediffClassName} ${sx.codediffWrap.className ?? ""}`.trim()}',
  );
  expect(routeSource).toContain(
    'const codediffClassName = `codediff-wrap mt10${hasReviewCards ? "" : " diffs-only"}`;',
  );
  expect(routeSource).not.toContain('style={{ marginTop: "10px" }}');
});

test("pull-request changes keeps codediff mt10 geometry and interaction in both review states", async ({
  page,
}) => {
  mkdirSync(screenshotDirectory, { recursive: true });
  let state: "review-cards" | "diffs-only" = "diffs-only";
  await mockChanges(page, () => state);

  for (const viewport of [
    { height: 900, width: 1366 },
    { height: 844, width: 390 },
  ]) {
    for (const nextState of ["review-cards", "diffs-only"] as const) {
      state = nextState;
      await page.setViewportSize(viewport);
      await page.goto(changesPath, { waitUntil: "networkidle" });

      const wrapper = page.locator('[data-stylex-owner="pull-request-changes-codediff-wrap"]');
      const diffs = wrapper.locator("#changes");
      const reviewWrap = wrapper.locator(":scope > .review-wrap");

      await expect(wrapper).toBeVisible();
      await expect(wrapper).toHaveClass(/\bcodediff-wrap\b/u);
      await expect(wrapper).toHaveClass(/\bmt10\b/u);
      await expect(wrapper).toHaveAttribute(
        "data-stylex-owner",
        "pull-request-changes-codediff-wrap",
      );
      await expect(wrapper).toHaveAttribute("data-style-src", /-pull-request-changes\.stylex\.ts/u);
      await expect(wrapper).toHaveCSS("margin-top", "10px");
      expect(await wrapper.getAttribute("style")).toBeNull();
      await expect(diffs).toBeVisible();
      await expect(
        wrapper.locator(
          "[data-toggle], [data-placement], [data-action], [data-href], [data-url], [data-request-method], [data-request-uri], [data-dismiss], [data-target], [data-trigger], [data-backdrop], [data-spy], [data-provider], [data-loading-text]",
        ),
      ).toHaveCount(0);

      if (nextState === "review-cards") {
        await expect(wrapper).not.toHaveClass(/\bdiffs-only\b/u);
        await expect(reviewWrap).toHaveCount(1);
        await expect(reviewWrap).toBeVisible();
        await expect(wrapper.locator(":scope > .btn-show-reviewcards")).toHaveCount(1);
        await expect(
          wrapper.locator('[data-stylex-owner="pull-request-changes-review-card"]'),
        ).toBeVisible();
      } else {
        await expect(wrapper).toHaveClass(/\bdiffs-only\b/u);
        await expect(reviewWrap).toHaveCount(0);
        await expect(wrapper.locator(":scope > .btn-show-reviewcards")).toHaveCount(0);
      }

      const geometry = await wrapper.evaluate((element) => {
        const diffsElement = element.querySelector<HTMLElement>("#changes");
        const reviewElement = element.querySelector<HTMLElement>(":scope > .review-wrap");
        if (!diffsElement) throw new Error("codediff diffs wrapper is missing");
        const wrapperBox = element.getBoundingClientRect();
        const diffsBox = diffsElement.getBoundingClientRect();
        const reviewBox = reviewElement?.getBoundingClientRect();
        return {
          diffs: {
            bottom: diffsBox.bottom,
            left: diffsBox.left,
            right: diffsBox.right,
            top: diffsBox.top,
          },
          documentScrollWidth: Math.max(
            document.documentElement.scrollWidth,
            document.body.scrollWidth,
          ),
          marginRight: getComputedStyle(diffsElement).marginRight,
          review: reviewBox
            ? {
                bottom: reviewBox.bottom,
                left: reviewBox.left,
                right: reviewBox.right,
                top: reviewBox.top,
              }
            : null,
          viewportWidth: window.innerWidth,
          wrapper: {
            bottom: wrapperBox.bottom,
            left: wrapperBox.left,
            right: wrapperBox.right,
            top: wrapperBox.top,
          },
        };
      });

      expect(geometry.wrapper.left).toBeGreaterThanOrEqual(-1);
      expect(geometry.wrapper.right).toBeLessThanOrEqual(geometry.viewportWidth + 1);
      expect(geometry.diffs.left).toBeGreaterThanOrEqual(geometry.wrapper.left - 1);
      expect(geometry.diffs.right).toBeLessThanOrEqual(geometry.wrapper.right + 1);
      expect(geometry.diffs.top).toBeGreaterThanOrEqual(geometry.wrapper.top - 1);
      expect(geometry.diffs.bottom).toBeLessThanOrEqual(geometry.wrapper.bottom + 1);
      expect(geometry.documentScrollWidth).toBeLessThanOrEqual(geometry.viewportWidth + 1);
      if (viewport.width <= 720) {
        expect(geometry.marginRight).toBe("0px");
      }
      if (nextState === "review-cards") {
        expect(geometry.review).not.toBeNull();
        expect(geometry.review!.left).toBeGreaterThanOrEqual(geometry.wrapper.left - 1);
        expect(geometry.review!.right).toBeLessThanOrEqual(geometry.wrapper.right + 1);
      } else {
        expect(geometry.review).toBeNull();
      }

      await page.screenshot({
        path: `${screenshotDirectory}/${nextState}-${viewport.width}x${viewport.height}.png`,
        fullPage: true,
      });

      if (nextState === "review-cards") {
        await wrapper.locator('[data-stylex-owner="pull-request-changes-review-card"]').click();
        await expect(page).toHaveURL(
          new RegExp(
            `${basePath}/admin/sample/pullRequest/9/changes/abcdef1234567890#thread-91$`,
            "u",
          ),
        );
      } else {
        const commitToggle = wrapper.locator("#commits > button");
        await commitToggle.click();
        await expect(wrapper.locator("#commits")).toHaveClass(/\bopen\b/u);
        await expect(wrapper.locator("#commits .dropdown-menu")).toBeVisible();
      }
    }
  }
});

async function mockChanges(page: Page, getState: () => "review-cards" | "diffs-only") {
  const session = {
    actorId: 1,
    avatarUrl: "/assets/images/default-avatar-32.png",
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
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
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
        isProtected: false,
        logoUrl: "/assets/images/project_default_logo.png",
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        viewerCanUpdate: true,
      },
    }),
  );
  await page.route(
    "**/api/v1/owners/admin/projects/sample/pull-requests/9/changes**",
    (route: Route) => {
      const threads = getState() === "review-cards" ? [reviewThread()] : [];
      return route.fulfill({
        contentType: "application/json",
        json: {
          cardThreads: threads,
          commits: [],
          files: [],
          inlineThreads: [],
          nonRangedThreads: [],
          pullRequest: pullRequestDetail(),
          threads,
        },
      });
    },
  );
}

function reviewThread() {
  return {
    authorAvatarUrl: "/assets/images/default-avatar-32.png",
    authorId: 2,
    authorLabel: "Dev Member",
    authorLoginId: "dev",
    comments: [
      {
        attachments: [],
        authorAvatarUrl: "/assets/images/default-avatar-32.png",
        authorId: 2,
        authorLabel: "Dev Member",
        authorLoginId: "dev",
        canDelete: false,
        canUpdate: false,
        contentsHtml: "<p>Review note</p>",
        contentsMarkdown: "Review note",
        createdLabel: "Jul 5, 2026",
        id: 701,
        threadId: 91,
        viaEmail: false,
      },
    ],
    commitId: "abcdef1234567890",
    createdLabel: "Jul 5, 2026",
    endLine: 1,
    endSide: "B",
    id: 91,
    isOutdated: false,
    path: "src/main.rs",
    prevCommitId: "",
    pullRequestNumber: 9,
    startLine: 1,
    startSide: "B",
    state: "open",
  };
}

function pullRequestDetail() {
  return {
    attachments: [],
    bodyHtml: "<p>Initial body</p>",
    bodyMarkdown: "Initial body",
    commits: [],
    conflict: false,
    contributor: {
      avatarUrl: "/assets/images/default-avatar-32.png",
      loginId: "dev",
      userId: 2,
      userLabel: "Dev Member",
    },
    createdLabel: "Jul 2, 2026",
    events: [],
    fromBranch: "feature/ui",
    fromOwnerName: "admin",
    fromProjectName: "sample",
    id: 90,
    isMerging: false,
    isWatching: false,
    lackingReviewerCount: 0,
    mergedCommitIdFrom: "",
    mergedCommitIdTo: "",
    ownerName: "admin",
    permissions: {
      canComment: false,
      canDeleteSourceBranch: false,
      canRead: true,
      canReadChanges: true,
      canReview: true,
      canRestoreSourceBranch: false,
      canUpdate: false,
      canUpdateState: false,
      canWatch: false,
    },
    projectName: "sample",
    pullRequestNumber: 9,
    receiver: {
      avatarUrl: "/assets/images/default-avatar-32.png",
      loginId: "admin",
      userId: 1,
      userLabel: "Site Admin",
    },
    requiredReviewerCount: 0,
    reviewed: false,
    reviewers: [],
    sourceBranchExists: true,
    state: "open",
    threads: [],
    title: "Initial title",
    toBranch: "main",
    updatedLabel: "Jul 2, 2026",
    watcherCount: 0,
  };
}
