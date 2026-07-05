import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const EXPECTED_HISTORY_FILE_BODY = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="bubble-wrap dark-gray repo-wrap"><div class="code-browse-wrap"><div id="breadcrumbs" class="code-breadcrumb-wrap"><a href="__BASE_PATH__/admin/sample/commits/main">sample</a><a href="__BASE_PATH__/admin/sample/commits/main/README.md">README.md</a></div><div id="history" class="commit-wrap"><table class="code-table commits mt10"><thead class="thead"><tr><td class="commit-id"><strong>@</strong></td><td class="messages"><strong>Commit message</strong></td><td class="browse"></td><td class="date"><strong>Author Date</strong></td><td class="author"><strong>Author</strong></td></tr></thead><tbody class="tbody"><tr><td class="commit-id"><button type="button" class="ybtn ybtn-mini btn-copy-commitId" title="Copy commit ID" data-commitid="abcdef1234567890"><i class="yobicon-copy"></i></button><a href="__BASE_PATH__/admin/sample/commit/abcdef1234567890?branch=main&amp;path=README.md#README-md" title="View commit">abcdef1</a></td><td class="messages"><span class="number-of-comments"><i class="yobicon-comments"></i> 2</span><a href="__BASE_PATH__/admin/sample/commit/abcdef1234567890?branch=main&amp;path=README.md#README-md" class="commitMsg short">Initial commit</a><button type="button" class="commitMsg moreBtn"><span>...</span></button><pre class="commitMsg desc hidden">Add README</pre></td><td class="browse"><a href="__BASE_PATH__/admin/sample/code/abcdef1/README.md" title="Browse code at this point" class="ybtn">Browse code</a></td><td class="date">Jul 1, 2026</td><td class="author"><a href="__BASE_PATH__/admin" class="avatar-wrap" data-toggle="tooltip" data-placement="top" title="admin"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a></td></tr></tbody></table></div></div><div class="actrow margin-top-20"><a href="__BASE_PATH__/admin/sample/commits/main/README.md?page=1" class="ybtn pull-left">Newer</a><a href="__BASE_PATH__/admin/sample/commits/main/README.md?page=3" class="ybtn pull-left">Older</a></div></div></div></div>
`;

const EXPECTED_HISTORY_NESTED_FILE_BODY = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="bubble-wrap dark-gray repo-wrap"><div class="code-browse-wrap"><div id="breadcrumbs" class="code-breadcrumb-wrap"><a href="__BASE_PATH__/admin/sample/commits/main">sample</a><a href="__BASE_PATH__/admin/sample/commits/main/docs">docs</a><a href="__BASE_PATH__/admin/sample/commits/main/docs/guide">guide</a><a href="__BASE_PATH__/admin/sample/commits/main/docs/guide/README.md">README.md</a></div><div id="history" class="commit-wrap"><table class="code-table commits mt10"><thead class="thead"><tr><td class="commit-id"><strong>@</strong></td><td class="messages"><strong>Commit message</strong></td><td class="browse"></td><td class="date"><strong>Author Date</strong></td><td class="author"><strong>Author</strong></td></tr></thead><tbody class="tbody"><tr><td class="commit-id"><button type="button" class="ybtn ybtn-mini btn-copy-commitId" title="Copy commit ID" data-commitid="abcdef1234567890"><i class="yobicon-copy"></i></button><a href="__BASE_PATH__/admin/sample/commit/abcdef1234567890?branch=main&amp;path=docs%2Fguide%2FREADME.md#docs-guide-README-md" title="View commit">abcdef1</a></td><td class="messages"><span class="number-of-comments"><i class="yobicon-comments"></i> 2</span><a href="__BASE_PATH__/admin/sample/commit/abcdef1234567890?branch=main&amp;path=docs%2Fguide%2FREADME.md#docs-guide-README-md" class="commitMsg short">Initial commit</a><button type="button" class="commitMsg moreBtn"><span>...</span></button><pre class="commitMsg desc hidden">Add README</pre></td><td class="browse"><a href="__BASE_PATH__/admin/sample/code/abcdef1/docs/guide/README.md" title="Browse code at this point" class="ybtn">Browse code</a></td><td class="date">Jul 1, 2026</td><td class="author"><a href="__BASE_PATH__/admin" class="avatar-wrap" data-toggle="tooltip" data-placement="top" title="admin"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a></td></tr></tbody></table></div></div><div class="actrow margin-top-20"><a href="__BASE_PATH__/admin/sample/commits/main/docs/guide/README.md?page=1" class="ybtn pull-left">Newer</a><a href="__BASE_PATH__/admin/sample/commits/main/docs/guide/README.md?page=3" class="ybtn pull-left">Older</a></div></div></div></div>
`;

test("project code file history matches legacy code/history.scala.html path DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const historyRequests: string[] = [];
  await mockProjectCodeFileHistory(page, historyRequests, "README.md");

  await page.goto(`${basePath}/admin/sample/commits/main/README.md?page=2`);
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Code");
  await expect(page.locator("#history .code-table.commits.mt10 tbody tr")).toHaveCount(1);
  expect(historyRequests).toEqual(["branch=main&page=2&path=README.md"]);
  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(page, EXPECTED_HISTORY_FILE_BODY.replaceAll("__BASE_PATH__", basePath)),
  );

  await expect(page.locator("#breadcrumbs a").first()).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/commits/main`,
  );
  await assertLegacyAnchorNoActiveMarkers(page.locator("#breadcrumbs a").first(), {
    href: `${basePath}/admin/sample/commits/main`,
    text: "sample",
  });
  await assertLegacyAnchorNoActiveMarkers(page.locator("#breadcrumbs a").nth(1), {
    href: `${basePath}/admin/sample/commits/main/README.md`,
    text: "README.md",
  });
  await assertLegacyAnchorNoActiveMarkers(page.locator("#history .commit-id a"), {
    href: `${basePath}/admin/sample/commit/abcdef1234567890?branch=main&path=README.md#README-md`,
    text: "abcdef1",
    title: "View commit",
  });
  await assertLegacyAnchorNoActiveMarkers(page.locator("#history .messages a.commitMsg.short"), {
    className: "commitMsg short",
    href: `${basePath}/admin/sample/commit/abcdef1234567890?branch=main&path=README.md#README-md`,
    text: "Initial commit",
  });
  await assertLegacyAnchorNoActiveMarkers(page.locator("#history .browse a"), {
    className: "ybtn",
    href: `${basePath}/admin/sample/code/abcdef1/README.md`,
    text: "Browse code",
    title: "Browse code at this point",
  });
  await assertLegacyAnchorNoActiveMarkers(page.locator("#history .author a.avatar-wrap"), {
    className: "avatar-wrap",
    href: `${basePath}/admin`,
    title: "admin",
  });
  await assertLegacyAnchorNoActiveMarkers(page.locator(".actrow a", { hasText: "Newer" }), {
    className: "ybtn pull-left",
    href: `${basePath}/admin/sample/commits/main/README.md?page=1`,
    text: "Newer",
  });
  await assertLegacyAnchorNoActiveMarkers(page.locator(".actrow a", { hasText: "Older" }), {
    className: "ybtn pull-left",
    href: `${basePath}/admin/sample/commits/main/README.md?page=3`,
    text: "Older",
  });

  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "code-history-file";
  });
  await page.locator(".actrow a", { hasText: "Older" }).click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/commits/main/README.md?page=3`);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("code-history-file");
  expect(historyRequests).toEqual([
    "branch=main&page=2&path=README.md",
    "branch=main&page=3&path=README.md",
  ]);
});

test("project code file history keeps nested legacy path segments", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const historyRequests: string[] = [];
  await mockProjectCodeFileHistory(page, historyRequests, "docs/guide/README.md");

  await page.goto(`${basePath}/admin/sample/commits/main/docs/guide/README.md?page=2`);
  await expect(page.locator("#history .code-table.commits.mt10 tbody tr")).toHaveCount(1);
  expect(historyRequests).toEqual(["branch=main&page=2&path=docs%2Fguide%2FREADME.md"]);
  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_HISTORY_NESTED_FILE_BODY.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project code file history route uses TanStack Link for internal anchors", () => {
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/commits/$branch/$filePath.tsx",
    "utf8",
  );
  const removedAdapterName = ["legacy", "Inactive", "Link", "Options"].join("");

  expect(routeSource).not.toMatch(/<a\b/u);
  expect(routeSource).not.toContain("commitHref(");
  expect(routeSource).not.toContain("createLink");
  expect(routeSource).not.toContain("projectHref(");
  expect(routeSource).not.toContain(removedAdapterName);
  expect(routeSource).not.toContain("setAttribute");
  expect(routeSource).not.toContain("removeAttribute");
  expect(routeSource).not.toContain("activeProps={{ className: undefined }}");
  expect(routeSource).toContain('import { Link, createFileRoute } from "@tanstack/react-router"');
  expect(
    routeSource.match(
      /activeOptions=\{\{\s*exact: true,\s*includeHash: true,\s*includeSearch: true,?\s*\}\}/gu,
    ),
  ).toHaveLength(8);
  expect(routeSource.match(/activeProps=\{legacyActiveMarkerSuppressionProps\}/gu)).toHaveLength(8);
  expect(routeSource).toContain('"aria-current": undefined');
  expect(routeSource).toContain('"data-status": undefined');
});

async function mockProjectCodeFileHistory(page: Page, historyRequests: string[], filePath: string) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/container", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
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
      }),
    });
  });
  await page.route("**/api/v1/projects/admin/sample/commits**", async (route) => {
    const url = new URL(route.request().url());
    historyRequests.push(url.searchParams.toString());
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        branches: [{ name: "main" }, { name: "feature/release" }],
        breadcrumbs: breadcrumbsFor(filePath),
        commits: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            authorDate: "Jul 1, 2026",
            authorEmail: "admin@example.com",
            authorLoginId: "admin",
            authorName: "Site Admin",
            commentCount: 2,
            commitId: "abcdef1234567890",
            commitShortId: "abcdef1",
            message: "Initial commit\nAdd README",
            shortMessage: "Initial commit",
          },
        ],
        hasNewer: true,
        hasOlder: true,
        noHead: false,
        ownerName: "admin",
        page: 2,
        path: filePath,
        projectName: "sample",
        selectedBranch: "main",
      }),
    });
  });
}

function breadcrumbsFor(filePath: string) {
  return filePath.split("/").map((name, index, parts) => ({
    name,
    path: parts.slice(0, index + 1).join("/"),
  }));
}

async function canonicalize(page: Page, selector: string) {
  return page.locator(selector).evaluate((root) => {
    return visit(root);

    function visit(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return (node.textContent ?? "").replace(/\s+/g, " ").trim();
      }
      if (!(node instanceof Element)) {
        return "";
      }
      const attrs = Array.from(node.attributes)
        .filter((attr) => !attr.name.startsWith("data-v-") && attr.name !== "alt")
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => `${attr.name}=${JSON.stringify(normalizeAttr(attr))}`)
        .join(" ");
      const open = attrs
        ? `<${node.tagName.toLowerCase()} ${attrs}>`
        : `<${node.tagName.toLowerCase()}>`;
      return `${open}${Array.from(node.childNodes)
        .map((child) => visit(child))
        .join("")}</${node.tagName.toLowerCase()}>`;
    }

    function normalizeAttr(attr: Attr) {
      return attr.name === "style" ? attr.value.replace(/\s+/g, "").replace(/;$/u, "") : attr.value;
    }
  });
}

async function assertLegacyAnchorNoActiveMarkers(
  locator: ReturnType<Page["locator"]>,
  expected: {
    className?: string;
    href: string;
    text?: string;
    title?: string;
  },
) {
  await expect(locator).toHaveAttribute("href", expected.href);
  if (expected.text !== undefined) {
    await expect(locator).toHaveText(expected.text);
  }
  if (expected.className !== undefined) {
    await expect(locator).toHaveAttribute("class", expected.className);
  } else {
    await expect(locator).not.toHaveAttribute("class", /.*/u);
  }
  if (expected.title !== undefined) {
    await expect(locator).toHaveAttribute("title", expected.title);
  } else {
    await expect(locator).not.toHaveAttribute("title", /.*/u);
  }
  await expect(locator).not.toHaveAttribute("aria-current", /.*/u);
  await expect(locator).not.toHaveAttribute("data-status", /.*/u);
}

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate((input) => {
    const template = document.createElement("template");
    template.innerHTML = input;
    return Array.from(template.content.children)
      .map((root) => visit(root))
      .join("");

    function visit(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return (node.textContent ?? "").replace(/\s+/g, " ").trim();
      }
      if (!(node instanceof Element)) {
        return "";
      }
      const attrs = Array.from(node.attributes)
        .filter((attr) => !attr.name.startsWith("data-v-") && attr.name !== "alt")
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => `${attr.name}=${JSON.stringify(normalizeAttr(attr))}`)
        .join(" ");
      const open = attrs
        ? `<${node.tagName.toLowerCase()} ${attrs}>`
        : `<${node.tagName.toLowerCase()}>`;
      return `${open}${Array.from(node.childNodes)
        .map((child) => visit(child))
        .join("")}</${node.tagName.toLowerCase()}>`;
    }

    function normalizeAttr(attr: Attr) {
      return attr.name === "style" ? attr.value.replace(/\s+/g, "").replace(/;$/u, "") : attr.value;
    }
  }, html);
}
