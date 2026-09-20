import { expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const changesPath = `${basePath}/admin/sample/pullRequest/9/changes`;
const screenshotDirectory = "/private/tmp/yona-pull-request-changes-codediff-mt10";
test("pull-request changes keeps codediff mt10 geometry and interaction in both review states", async ({
  page,
}) => {
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

      const wrapper = page.locator('[data-owner="pull-request-changes-codediff-wrap"]');
      const diffs = wrapper.locator("#changes");
      const reviewWrap = wrapper.locator(":scope > .review-wrap");

      await expect(wrapper).toBeVisible();
      await expect(wrapper).toHaveClass(/\bcodediff-wrap\b/u);
      await expect(wrapper).toHaveClass(/\bmt10\b/u);
      await expect(wrapper).toHaveCSS("margin-top", "10px");
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
          wrapper.locator('[data-owner="pull-request-changes-review-card"]'),
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
        await wrapper.locator('[data-owner="pull-request-changes-review-card"]').click();
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
