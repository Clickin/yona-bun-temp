import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const notificationTarget = "/admin/sample/post/1#comment-1";

test("authenticated home notification keeps the cross-shell post handoff SPA-native and immediate", async ({
  page,
}) => {
  await mockHomeToPost(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/`);
  await expect(page.getByRole("link", { name: "Seed notes" })).toBeVisible();

  const documentToken = await page.evaluate(() => window.__spaShellTransitionDocumentToken);
  const documentRequests: string[] = [];
  page.on("request", (request) => {
    if (request.isNavigationRequest() && request.resourceType() === "document") {
      documentRequests.push(request.url());
    }
  });

  await page.getByRole("link", { name: "Seed notes" }).click();
  await expect(page.locator("#comment-1")).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(notificationTarget)}$`));

  expect(documentRequests).toEqual([]);
  await expect
    .poll(() => page.evaluate(() => window.__spaShellTransitionDocumentToken))
    .toBe(documentToken);
  await expect(page.locator('[data-last-outlet-transition="true"]')).toHaveCount(0);

  const hashTarget = await page.locator("#comment-1").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      bottom: rect.bottom,
      scrollY: window.scrollY,
      top: rect.top,
      viewportHeight: window.innerHeight,
    };
  });
  expect(hashTarget.scrollY).toBeGreaterThan(0);
  expect(hashTarget.top).toBeGreaterThanOrEqual(0);
  expect(hashTarget.bottom).toBeLessThanOrEqual(hashTarget.viewportHeight);
});

test("reduced motion preserves the same immediate hash handoff", async ({ page }) => {
  await mockHomeToPost(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${basePath}/`);
  await page.getByRole("link", { name: "Seed notes" }).click();

  await expect(page.locator("#comment-1")).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(notificationTarget)}$`));
  await expect(page.locator('[data-last-outlet-transition="true"]')).toHaveCount(0);
});

async function mockHomeToPost(page: Page) {
  await page.addInitScript(() => {
    window.__spaShellTransitionDocumentToken = crypto.randomUUID();
  });
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en"],
    };
  }, basePath);

  const session = {
    actorId: 1,
    avatarUrl: "/assets/images/default-avatar-32.png",
    defaultLandingPath: "/",
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
  await page.route("**/api/v1/notifications?*", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        hasMore: false,
        items: [
          {
            actor: { avatarUrl: "", displayName: "Site Admin", loginId: "admin" },
            createdAt: "2026-07-19T12:00:00Z",
            createdLabel: "just now",
            eventType: "NEW_COMMENT",
            id: "post-1",
            message: "A comment was added.",
            targetHref: notificationTarget,
            targetTitle: "Seed notes",
            typeIcon: "comment2",
          },
        ],
        total: 1,
      },
    }),
  );
  await page.route("**/api/v1/owners/**/projects/**/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        id: 1,
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
        projectScope: "PUBLIC",
        showBoard: true,
        vcs: "GIT",
        viewerCanUpdate: false,
      },
    }),
  );
  await page.route("**/api/v1/projects/**/posts/1", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        attachments: [],
        authorAvatarUrl: "",
        authorId: "1",
        authorLabel: "Site Admin",
        authorLoginId: "admin",
        bodyHtml: "",
        bodyMarkdown: `${"A long board post.\n\n".repeat(100)}End.`,
        commentCount: 1,
        comments: [
          {
            attachments: [],
            authorId: "2",
            authorLabel: "Reviewer",
            authorLoginId: "reviewer",
            contentsHtml: "",
            contentsMarkdown: "Looks good.",
            createdLabel: "just now",
            id: "1",
            parentCommentId: "",
            viaEmail: false,
          },
        ],
        createdLabel: "just now",
        historyHtml: "",
        historyMarkdown: "",
        id: "1",
        isWatching: false,
        labels: [],
        notice: false,
        ownerName: "admin",
        permissions: {
          canComment: false,
          canCreate: true,
          canDelete: false,
          canRead: true,
          canSetNotice: false,
          canUpdate: false,
          canWatch: true,
        },
        postNumber: "1",
        projectName: "sample",
        readme: false,
        title: "Seed notes",
        updatedLabel: "just now",
        watcherCount: 0,
      },
    }),
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

declare global {
  interface Window {
    __spaShellTransitionDocumentToken?: string;
  }
}
