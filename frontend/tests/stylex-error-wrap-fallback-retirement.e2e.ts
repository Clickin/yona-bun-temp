import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const route = (path: string) => read(`../src/routes/${path}`);

const bridgeSelectors = [
  ".error-wrap {",
  ".error-wrap .ico {",
  ".error-wrap .ico-err1 {",
  ".error-wrap .ico-err2 {",
  ".error-wrap p {",
] as const;

const reachableEmitters = [
  ["secret.tsx", ["secret-notfound-error-wrap"]],
  [
    "$ownerName/$projectName.tsx",
    ["project-members-error-wrap", "project-post-edit-internal-error-wrap"],
  ],
  ["$ownerName/$projectName/reviews.tsx", ["project-reviews-empty-state"]],
  ["$ownerName/$projectName/posts.tsx", ["project-posts-empty"]],
  ["$ownerName/$projectName/issue/$issueNumber.tsx", ["project-issue-detail-error-wrap"]],
  ["$ownerName/$projectName/issue/labelsform.tsx", ["project-labels-empty-error-wrap"]],
  [
    "$ownerName/$projectName/issue/$issueNumber/editform.tsx",
    ["project-issue-editform-error-wrap"],
  ],
  ["$ownerName/$projectName/members.tsx", ["project-members-error-wrap"]],
  ["$ownerName/$projectName/newPullRequestForm.tsx", ["new-pull-request-error-wrap"]],
  ["$ownerName/$projectName/issues.tsx", ["project-issues-empty-error-wrap"]],
  ["$ownerName/$projectName/code/$branch/$filePath.tsx", ["project-code-file-error-wrap"]],
  ["$ownerName/$projectName/milestone/$milestoneId.tsx", ["project-milestone-detail-error-wrap"]],
  ["$ownerName/$projectName/milestones.tsx", ["project-milestones-empty"]],
  ["$ownerName/$projectName/pullRequests.tsx", ["project-pullrequests-empty-error-wrap"]],
  ["$ownerName/$projectName/post/$postNumber.tsx", ["post-detail-error-wrap"]],
  [
    "$ownerName/$projectName/pullRequest/$pullRequestNumber.tsx",
    ["pull-request-detail-error-wrap"],
  ],
  [
    "$ownerName/$projectName/pullRequest/$pullRequestNumber/changes.tsx",
    ["pull-request-changes-error-wrap"],
  ],
  [
    "$ownerName/$projectName/pullRequest/$pullRequestNumber/editform.tsx",
    ["pull-request-edit-error-wrap"],
  ],
  ["$ownerName/$projectName/search.tsx", ["project-search-forbidden-wrap"]],
  ["$ownerName/$projectName/webhooks.tsx", ["project-webhooks-empty"]],
  [
    "$user.tsx",
    [
      "user-profile-notfound-error-wrap",
      "user-profile-open-issues-empty-wrap",
      "user-profile-closed-issues-empty-wrap",
      "user-profile-pull-requests-empty-wrap",
      "user-profile-projects-empty-wrap",
    ],
  ],
  ["-search-screen.tsx", ["search-error-wrap"]],
  ["__root.tsx", ["root-alias-notfound-error-wrap"]],
  ["user/issues.tsx", ["user-issues-empty-error-wrap"]],
  ["organizations/$organizationName/boards.tsx", ["organization-boards-empty"]],
  ["organizations/$organizationName/issues.tsx", ["organization-issues-empty"]],
  ["organizations/$organizationName/members.tsx", ["organization-members-error-wrap"]],
  ["organizations/$organizationName/pullrequests.tsx", ["organization-pullrequests-empty"]],
  ["organizations/$organizationName/search.tsx", ["organization-search-error-wrap"]],
  [
    "resetPassword.tsx",
    ["reset-password-bad-request-error-wrap", "reset-password-bad-request-message"],
  ],
] as const;

const ownerE2Es = [
  "stylex-secret-notfound-error-wrap.e2e.ts",
  "stylex-project-internal-error-wrap.e2e.ts",
  "stylex-project-reviews.e2e.ts",
  "stylex-project-posts.e2e.ts",
  "stylex-project-issue-detail-error-wrap.e2e.ts",
  "stylex-project-labels-error-wrap.e2e.ts",
  "stylex-project-issue-editform-error-wrap.e2e.ts",
  "stylex-project-members-error-wrap.e2e.ts",
  "stylex-project-new-pullrequest-error-wrap.e2e.ts",
  "stylex-project-issues-error-wrap.e2e.ts",
  "stylex-project-code-file-error-wrap.e2e.ts",
  "stylex-project-milestone-error-wrap.e2e.ts",
  "stylex-project-milestones-error-wrap.e2e.ts",
  "stylex-project-pullrequests-error-wrap.e2e.ts",
  "stylex-project-post-detail-error-wrap.e2e.ts",
  "stylex-project-pullrequest-detail-error-wrap.e2e.ts",
  "stylex-project-pullrequest-changes-error-wrap.e2e.ts",
  "stylex-project-pullrequest-editform-error-wrap.e2e.ts",
  "stylex-project-search-error-wrap.e2e.ts",
  "stylex-project-webhooks-error-wrap.e2e.ts",
  "stylex-user-profile-notfound-error-wrap.e2e.ts",
  "stylex-user-issues-error-wrap.e2e.ts",
  "stylex-root-notfound-error-wrap.e2e.ts",
  "stylex-search-error-wrap.e2e.ts",
  "stylex-organization-boards.e2e.ts",
  "stylex-organization-members-error-wrap.e2e.ts",
  "stylex-organization-pullrequests.e2e.ts",
  "stylex-organization-search-error-wrap.e2e.ts",
  "stylex-reset-password-bad-request.e2e.ts",
] as const;

test("shared error-wrap fallback bridge is retired without changing emitters", () => {
  const appCss = read("../src/app.css");
  for (const selector of bridgeSelectors) expect(appCss).not.toContain(selector);
  for (const selector of [
    ".reset-password-bad-request > .project-page-wrap {",
    ".reset-password-bad-request .ico-404 {",
    ".reset-password-bad-request .ybtn-info {",
  ]) {
    expect(appCss).toContain(selector);
  }

  for (const [file, owners] of reachableEmitters) {
    const source = route(file);
    expect(source).toContain("error-wrap");
    for (const owner of owners)
      expect(source).toContain(
        `data-stylex-${owner.includes("reset-password") ? "part" : "owner"}="${owner}"`,
      );
  }

  const deadProducer = route("$ownerName/$projectName/post/$postNumber.tsx");
  expect(deadProducer).toContain("function ProjectPostEditNotFoundBody");
  const deadStart = deadProducer.indexOf("function ProjectPostEditNotFoundBody");
  const deadEnd = deadProducer.indexOf("function ProjectPostDetailBody", deadStart);
  const deadBody = deadProducer.slice(deadStart, deadEnd);
  expect(deadBody).toContain('<div className="error-wrap">');
  // This plain-class producer is unreachable and is intentionally excluded from the owner graph.
  expect(deadBody).not.toContain("data-stylex-owner");

  const fallback = read("../public/legacy-assets/stylesheets/legacy-fallback.css");
  expect(fallback).toContain(".error-wrap {");
  expect(fallback).toContain(".error-wrap p {");
  expect(fallback).toContain(".ico-err1 {");
  expect(fallback).toContain(".ico-err2 {");

  const frozen = [
    [
      "../../yona-original/app/assets/stylesheets/less/_page.less",
      "6e8fa41b50f508d747e8dd58797014eabdfb9908",
    ],
    [
      "../../yona-original/app/assets/stylesheets/less/_sprites.less",
      "ef7f7268dff82f7140628c4ec064f7203d3d0957",
    ],
  ] as const;
  for (const [path, hash] of frozen) {
    expect(createHash("sha1").update(read(path)).digest("hex")).toBe(hash);
  }
  expect(read("../../yona-original/app/assets/stylesheets/less/_page.less")).toContain(
    "padding:100px 0px;",
  );
  expect(read("../../yona-original/app/assets/stylesheets/less/_sprites.less")).toContain(
    "background-position: -80px -160px;",
  );

  for (const file of ownerE2Es) {
    expect(existsSync(new URL(`./${file}`, import.meta.url))).toBe(true);
    expect(read(`./${file}`)).toContain("data-stylex");
  }
});

test("StyleX error-wrap behavior and fallback stylesheet presence follow the runtime flag", async ({
  page,
}) => {
  await page.goto(`${basePath}/missing-legacy-route/unknown/root-stylex-notfound`, {
    waitUntil: "networkidle",
  });
  const wrap = page.locator('[data-stylex-owner="root-alias-notfound-error-wrap"]');
  await expect(wrap).toBeVisible();
  await expect(wrap).toHaveCSS("padding-top", "100px");
  await expect(wrap).toHaveCSS("text-align", "center");
  await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(
    process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? 0 : 1,
  );
});
