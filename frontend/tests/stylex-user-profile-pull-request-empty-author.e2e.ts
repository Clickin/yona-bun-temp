import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, isGuest: false, loginId: "viewer" },
    }),
  );
  await page.route("**/api/v1/users/admin/profile**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        daysAgo: 14,
        selected: "pullRequests",
        viewerCanEditProfile: false,
        profile: {
          avatarUrl: "",
          connectedSocialProviders: [],
          displayName: "Admin User",
          englishName: "Admin",
          isBlocked: false,
          isGuest: false,
          isSiteAdmin: false,
          loginId: "admin",
          primaryEmailAddress: null,
          sinceLabel: "2026-06-30",
        },
        issueItems: [],
        memberProjects: [],
        pullRequestItems: [
          {
            ownerName: "admin",
            projectName: "sample",
            pullRequestNumber: 12,
            title: "Pull request without author",
            state: "open",
            conflict: false,
            projectLogoUrl: "/assets/images/sample-logo.png",
            contributorLoginId: "",
            contributorLabel: "",
            updatedLabel: "2 days ago",
            commentCount: 0,
            receiverLoginId: "receiver",
            receiverLabel: "Receiver User",
            receiverAvatarUrl: "/assets/images/receiver.png",
          },
        ],
      },
    }),
  );
});

test("authenticated public profile preserves legacy pull-request empty-author infos item", async ({
  page,
}) => {
  const [routeSource, styleSource, viewScala, partial, pageLess, responsiveLess, messages] =
    await Promise.all([
      readFile(new URL("../src/routes/$user.tsx", import.meta.url), "utf8"),
      readFile(new URL("../src/routes/-user-profile.stylex.ts", import.meta.url), "utf8"),
      readFile(
        new URL("../../yona-original/app/views/user/view.scala.html", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL(
          "../../yona-original/app/views/user/partial_pullRequests.scala.html",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL(
          "../../yona-original/app/assets/stylesheets/less/_responsive.less",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(new URL("../../yona-original/conf/messages", import.meta.url), "utf8"),
    ]);

  expect(viewScala).toContain("@partial_pullRequests(pull, pull.toProject)");
  expect(partial).toContain('<span class="infos-item">@Messages("issue.noAuthor")</span>');
  expect(pageLess).toContain(".infos-item {");
  expect(pageLess).toContain("margin-right:6px;");
  expect(pageLess).toContain("float:left;");
  expect(responsiveLess).toContain("padding: 10px 0 !important;");
  expect(messages).toContain("issue.noAuthor = No author");

  expect(routeSource).toContain('data-stylex-owner="user-profile-pull-request-infos-empty-author"');
  expect(routeSource).toContain('t("issue.noAuthor")');
  expect(styleSource).toContain('pullRequestInfosItem: { float: "left", marginRight: "6px" }');

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin?selected=pullRequests`, { waitUntil: "domcontentloaded" });

  const row = page.locator('[data-stylex-owner="user-profile-pull-request-row"]').first();
  const emptyAuthor = row.locator(
    '[data-stylex-owner="user-profile-pull-request-infos-empty-author"]',
  );
  const date = row.locator('[data-stylex-owner="user-profile-pull-request-infos-date"]');
  const authorLink = row.locator(
    '[data-stylex-owner="user-profile-pull-request-infos-author-link"]',
  );

  await expect(emptyAuthor).toHaveText("No author");
  await expect(authorLink).toHaveCount(0);
  await expect(date).toHaveText("2 days ago");

  const desktop = await row.evaluate((node) => {
    const emptyAuthorEl = node.querySelector<HTMLElement>(
      '[data-stylex-owner="user-profile-pull-request-infos-empty-author"]',
    );
    const dateEl = node.querySelector<HTMLElement>(
      '[data-stylex-owner="user-profile-pull-request-infos-date"]',
    );
    const authorLinkEl = node.querySelector<HTMLElement>(
      '[data-stylex-owner="user-profile-pull-request-infos-author-link"]',
    );
    if (!emptyAuthorEl || !dateEl) {
      throw new Error("missing infos owners");
    }
    return {
      emptyAuthorFloat: getComputedStyle(emptyAuthorEl).float,
      emptyAuthorMarginRight: getComputedStyle(emptyAuthorEl).marginRight,
      dateFloat: getComputedStyle(dateEl).float,
      dateMarginRight: getComputedStyle(dateEl).marginRight,
      hasAuthorLink: Boolean(authorLinkEl),
      noOverflow: document.documentElement.scrollWidth <= window.innerWidth,
    };
  });

  expect(desktop).toEqual({
    emptyAuthorFloat: "left",
    emptyAuthorMarginRight: "6px",
    dateFloat: "left",
    dateMarginRight: "6px",
    hasAuthorLink: false,
    noOverflow: true,
  });

  await expect(emptyAuthor).not.toHaveAttribute("style");
  for (const attribute of [
    "data-toggle",
    "data-placement",
    "data-action",
    "data-href",
    "data-url",
    "data-target",
    "data-original-title",
  ]) {
    await expect(emptyAuthor).not.toHaveAttribute(attribute);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await row.evaluate((node) => {
    const rowEl = node as HTMLElement;
    const emptyAuthorEl = node.querySelector<HTMLElement>(
      '[data-stylex-owner="user-profile-pull-request-infos-empty-author"]',
    );
    if (!emptyAuthorEl) {
      throw new Error("missing empty author owner");
    }
    const rowBox = rowEl.getBoundingClientRect();
    const emptyAuthorBox = emptyAuthorEl.getBoundingClientRect();
    return {
      emptyAuthorMarginRight: getComputedStyle(emptyAuthorEl).marginRight,
      contained:
        emptyAuthorBox.left >= rowBox.left - 1 &&
        emptyAuthorBox.right <= rowBox.right + 1 &&
        document.documentElement.scrollWidth <= window.innerWidth,
    };
  });

  expect(mobile).toEqual({
    emptyAuthorMarginRight: "6px",
    contained: true,
  });
});
