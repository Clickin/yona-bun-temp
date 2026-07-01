import { expect, test, type Page } from "@playwright/test";

const EXPECTED_COMPARE_BODY = `
<div class="project-page-wrap"><div class="code-browse-wrap"><p class="commitInfo"><strong class="commitId">@abcdef1234567890..1234567890abcdef</strong></p><div class="alert">No changes</div></div></div>
`;

test("project code compare no-change state matches legacy code/compare.scala.html DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const compareRequests: string[] = [];
  await mockProjectCompare(page, compareRequests);

  await page.goto(`${basePath}/admin/sample/compare/abcdef1234567890..1234567890abcdef`);
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Code");
  await expect(page.locator(".commitInfo .commitId")).toHaveText(
    "@abcdef1234567890..1234567890abcdef",
  );
  expect(compareRequests).toEqual(["abcdef1234567890..1234567890abcdef"]);
  expect(await canonicalize(page, ".project-page-wrap")).toEqual(
    await canonicalizeHtml(page, EXPECTED_COMPARE_BODY),
  );
});

async function mockProjectCompare(page: Page, compareRequests: string[]) {
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
  await page.route("**/api/v1/projects/admin/sample/compare/**", async (route) => {
    compareRequests.push(route.request().url().split("/compare/")[1] ?? "");
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        commitA: { commitId: "abcdef1234567890" },
        commitB: { commitId: "1234567890abcdef" },
        files: [],
        noHead: false,
        ownerName: "admin",
        projectName: "sample",
        revA: "abcdef1234567890",
        revB: "1234567890abcdef",
      }),
    });
  });
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
