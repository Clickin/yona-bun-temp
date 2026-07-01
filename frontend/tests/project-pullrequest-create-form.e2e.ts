import { expect, test, type Page } from "@playwright/test";

const EXPECTED_CREATE_FORM = `
<div class="content-wrap frm-wrap"><form action="__BASE_PATH__/admin/sample/pullRequests" enctype="multipart/form-data" class="nm"><div class="pull-request-wrap"><div class="pull-left"><label for="fromProjectId" class="field-title">From</label><select id="fromProjectId" name="fromProjectId" data-toggle="select2" class="mr5"><option></option><option value="7" selected="">admin/sample</option></select><select id="fromBranch" name="fromBranch" data-toggle="select2" data-format="branch" data-dropdown-css-class="branches" data-placeholder="Select branch"><option></option><option value="feature/ui" selected="">feature/ui</option><option value="main">main</option></select></div><div class="arrow"><i class="yobicon-right-2"></i></div><div class="pull-right"><label for="toProjectId" class="field-title">To</label><select id="toProjectId" name="toProjectId" data-toggle="select2" class="mr5"><option></option><option value="7" selected="">admin/sample</option></select><select id="toBranch" name="toBranch" data-toggle="select2" data-format="branch" data-dropdown-css-class="branches" data-placeholder="Select branch"><option></option><option value="main" selected="">main</option></select></div></div><span id="pullRequestState" data-value="OPEN"></span><div id="status" class="alert mt20 mb20">We are checking if the code is safe. Please wait for a while to complete this process.</div><div><input type="text" id="title" name="title" maxlength="255" class="text" placeholder="Title"><div style="position:relative"><div data-toggle="markdown-editor" class="markdown-editor-wrap"><textarea id="editor-body-content-body" name="body" data-editor-mode="content-body"></textarea><div id="preview-content-body" class="preview markdown-wrap"></div></div></div><div class="upload-wrap content-footer" data-resource-type="PULL_REQUEST"><div class="attach-wrap"><div class="attachments" id="attachments"></div></div></div><div class="actions"><button type="submit" class="ybtn ybtn-success">Send pull request</button><a href="javascript:history.back();" class="ybtn">Cancel</a></div></div><ul class="nav nav-tabs mt20"><li class="active"><a href="#__commits" data-toggle="tab"><span class="vmiddle-inline">Commits</span><span id="numOfCommits" class="num-badge vmiddle-inline">1</span></a></li></ul><div class="tab-content"><div id="__commits" class="code-browse-wrap tab-pane active"><div id="mergeResult" class="code-browser-wrap" data-commits="1" data-pullrequest-title="" data-pullrequest-body="" data-conflict="false"><div class="commit-wrap"><table class="code-table commits"><thead class="thead"><tr><td class="commit-id"><strong>@</strong></td><td class="messages"><strong>Commit message</strong></td><td class="date"><strong>Commit date</strong></td><td class="author"><strong>Author</strong></td></tr></thead><tbody class="tbody"><tr><td class="commit-id"><a href="__BASE_PATH__/admin/sample/commit/abcdef1234567890">abcdef1</a></td><td class="messages"><span class="commitMsg short">Add UI</span></td><td class="date" title="Jul 2, 2026">Jul 2, 2026</td><td class="author dev@example.com"><div class="avatar-wrap"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></div></td></tr></tbody></table></div></div></div></div></form></div>
`;

test("project pull request create form matches legacy git/create.scala.html core DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const postRequests: unknown[] = [];
  await mockProjectPullRequestCreateForm(page, postRequests);

  await page.goto(
    `${basePath}/admin/sample/newPullRequestForm?fromBranch=feature/ui&toBranch=main`,
  );
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText(
    "Pull request",
  );
  await expect(page.locator("#fromBranch")).toHaveAttribute("data-placeholder", "Select branch");
  await expect(page.locator("#toBranch")).toHaveAttribute("data-placeholder", "Select branch");

  expect(await canonicalize(page, ".content-wrap.frm-wrap")).toEqual(
    await canonicalizeHtml(page, EXPECTED_CREATE_FORM.replaceAll("__BASE_PATH__", basePath)),
  );

  await page.fill("#title", "Improve UI");
  await page.fill("#editor-body-content-body", "Body text");
  await page.click('form.nm button[type="submit"]');

  await expect
    .poll(() => postRequests)
    .toEqual([
      {
        attachmentIds: [],
        bodyMarkdown: "Body text",
        fromBranch: "feature/ui",
        fromProjectId: 7,
        title: "Improve UI",
        toBranch: "main",
        toProjectId: 7,
      },
    ]);
  await expect(page).toHaveURL(`${basePath}/admin/sample/pullRequests`);
});

async function mockProjectPullRequestCreateForm(page: Page, postRequests: unknown[]) {
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
  await page.route("**/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-token" },
      body: JSON.stringify({ user: { loginId: "admin" } }),
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
  await page.route(
    "**/api/v1/owners/admin/projects/sample/pull-requests/form-options?*",
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          fromBranches: [
            { name: "feature/ui", selected: true },
            { name: "main", selected: false },
          ],
          fromProjects: [{ id: 7, ownerName: "admin", projectName: "sample", selected: true }],
          mode: "create",
          selected: {
            fromBranch: "feature/ui",
            fromProjectId: 7,
            toBranch: "main",
            toProjectId: 7,
          },
          toBranches: [{ name: "main", selected: true }],
          toProjects: [{ id: 7, ownerName: "admin", projectName: "sample", selected: true }],
        }),
      });
    },
  );
  await page.route(
    "**/api/v1/owners/admin/projects/sample/pull-requests/merge-result?*",
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          commits: [
            {
              authorDateLabel: "Jul 2, 2026",
              authorEmail: "dev@example.com",
              commitId: "abcdef1234567890",
              commitMessage: "Add UI",
              commitShortId: "abcdef1",
              state: "CURRENT",
            },
          ],
          conflict: false,
          noHead: false,
        }),
      });
    },
  );
  await page.route("**/api/v1/owners/admin/projects/sample/pull-requests", async (route) => {
    if (route.request().method() === "POST") {
      postRequests.push(route.request().postDataJSON());
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ pullRequestNumber: 9 }),
      });
      return;
    }
    await route.fallback();
  });
}

async function canonicalize(page: Page, selector: string) {
  return page.locator(selector).evaluate((root) => {
    return visit(root);

    function visit(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return normalizeText(node.textContent ?? "");
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
      return `${open}${Array.from(node.childNodes).map(visit).join("")}</${node.tagName.toLowerCase()}>`;
    }

    function normalizeAttr(attr: Attr) {
      const value = attr.value.replace(/;\s*$/u, "");
      return attr.name === "style" ? value.replace(/\s+/gu, "") : value;
    }

    function normalizeText(value: string) {
      return value.replace(/\s+/gu, " ").trim();
    }
  });
}

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate((markup) => {
    const template = document.createElement("template");
    template.innerHTML = markup.trim();
    const root = template.content.firstElementChild;
    return root ? visit(root) : "";

    function visit(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return normalizeText(node.textContent ?? "");
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
      return `${open}${Array.from(node.childNodes).map(visit).join("")}</${node.tagName.toLowerCase()}>`;
    }

    function normalizeAttr(attr: Attr) {
      const value = attr.value.replace(/;\s*$/u, "");
      return attr.name === "style" ? value.replace(/\s+/gu, "") : value;
    }

    function normalizeText(value: string) {
      return value.replace(/\s+/gu, " ").trim();
    }
  }, html);
}
