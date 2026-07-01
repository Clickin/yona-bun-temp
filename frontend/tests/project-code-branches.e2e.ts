import { expect, test, type Page } from "@playwright/test";

const EXPECTED_BRANCHES_BODY = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="bubble-wrap dark-gray repo-wrap"><div class="code-browse-wrap"><ul class="nav nav-tabs" style="margin-bottom:20px"><li><a href="__BASE_PATH__/admin/sample/code/main">Files</a></li><li><a href="__BASE_PATH__/admin/sample/commits/main">Commit</a></li><li class="active"><a href="__BASE_PATH__/admin/sample/branches">Branches</a></li></ul><table class="table branch-list-wrap"><thead class="thead"><tr><th>Branches</th><th>Latest commit</th><th>Latest pull request</th><th></th></tr></thead><tbody><tr class="head"><td class="branchName"><a href="__BASE_PATH__/admin/sample/code/main">main</a><span class="headBranch ml10">Default branch</span></td><td class="commit"><a href="__BASE_PATH__/admin/sample/commits/main" class="commitId" title="abcdef1234567890">abcdef1</a><span class="date" data-toggle="tooltip" data-placement="top" title="Jul 1, 2026">Jul 1, 2026</span></td><td class="pullRequest"><span class="disabled">No pull request has been sent</span></td><td class="actions"></td></tr><tr><td class="branchName"><a href="__BASE_PATH__/admin/sample/code/feature%2Frelease">release</a></td><td class="commit"><a href="__BASE_PATH__/admin/sample/commits/feature%2Frelease" class="commitId" title="1234567890abcdef">1234567</a><span class="date" data-toggle="tooltip" data-placement="top" title="Jul 2, 2026">Jul 2, 2026</span></td><td class="pullRequest"><a href="__BASE_PATH__/admin/sample/pullRequest/3" class="blue-txt pullrequest-state open" data-toggle="tooltip" data-placement="top" title="Open">pullRequest-3</a></td><td class="actions"><button type="button" class="ybtn ybtn-default ybtn-small" data-request-method="post" data-request-uri="__BASE_PATH__/admin/sample/code/feature%2Frelease/setAsDefault">Set as default branch</button><a href="__BASE_PATH__/admin/sample/code/feature%2Frelease/" class="ybtn ybtn-danger ybtn-small" data-request-method="delete">Delete</a></td></tr></tbody></table></div></div></div></div>
`;

test("project code branches matches legacy code/branches.scala.html DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const setDefaultRequests: unknown[] = [];
  const deleteRequests: unknown[] = [];
  await mockProjectBranches(page, setDefaultRequests, deleteRequests);

  await page.goto(`${basePath}/admin/sample/branches`);
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Code");
  await expect(page.locator(".branch-list-wrap tbody tr")).toHaveCount(2);

  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(page, EXPECTED_BRANCHES_BODY.replaceAll("__BASE_PATH__", basePath)),
  );

  const setDefaultResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/projects/admin/sample/branches/default") &&
      response.request().method() === "POST",
  );
  await page.click(".branch-list-wrap button[data-request-method='post']");
  await setDefaultResponse;
  expect(setDefaultRequests).toEqual([{ branchName: "feature/release" }]);

  const deleteResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/projects/admin/sample/branches") &&
      response.request().method() === "DELETE",
  );
  await page.click(".branch-list-wrap a[data-request-method='delete']");
  await deleteResponse;
  expect(deleteRequests).toEqual([{ branchName: "feature/release" }]);
});

async function mockProjectBranches(
  page: Page,
  setDefaultRequests: unknown[],
  deleteRequests: unknown[],
) {
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
  await page.route("**/api/v1/projects/admin/sample/branches", async (route) => {
    if (route.request().method() === "DELETE") {
      deleteRequests.push(route.request().postDataJSON());
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(branchesPayload()),
    });
  });
  await page.route("**/api/v1/projects/admin/sample/branches/default", async (route) => {
    setDefaultRequests.push(route.request().postDataJSON());
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(branchesPayload()),
    });
  });
}

function branchesPayload() {
  return {
    branches: [
      {
        commitDate: "Jul 1, 2026",
        commitId: "abcdef1234567890",
        commitMessage: "Initial commit",
        commitShortId: "abcdef1",
        isDefault: true,
        name: "main",
        pullRequest: null,
        shortName: "main",
      },
      {
        commitDate: "Jul 2, 2026",
        commitId: "1234567890abcdef",
        commitMessage: "Release branch",
        commitShortId: "1234567",
        isDefault: false,
        name: "feature/release",
        pullRequest: {
          ownerName: "admin",
          projectName: "sample",
          pullRequestNumber: 3,
          state: "open",
        },
        shortName: "release",
      },
    ],
    defaultBranch: "main",
    noHead: false,
    ownerName: "admin",
    permissions: { canDelete: true, canUpdate: true },
    projectName: "sample",
  };
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
