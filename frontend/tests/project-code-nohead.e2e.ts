import { expect, test, type Page } from "@playwright/test";

const EXPECTED_NO_HEAD_BODY = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="row-fluid"><div class="span12"><div class="alert alert-block"><h4>The repository is empty!</h4></div><h5>Create a new local repository by cloning the repository created on Yona, and push README.md file.</h5><pre><code>git clone http://admin@example.com/admin/sample sample
cd sample/
echo "# sample" > README.md
git add README.md
git commit -m "Hello Yona"
git push origin master</code></pre><h5>Or, create a new local repository and add it as a remote repository of the Yona repository. Then push README.md file.</h5><pre><code>mkdir sample
cd sample/
echo "# sample" > README.md
git init
git add README.md
git commit -m "Hello Yona"
git remote add origin http://admin@example.com/admin/sample
git push origin master</code></pre><h5>If you have already created a local git repository, you can just add a git repo created in (0) to make a remote repo and push your code.</h5><pre><code>git remote add origin http://admin@example.com/admin/sample
git push origin master</code></pre><h5>You can keep updating your code in your Yona repository by using 'pull' and 'push'. 'pull' retrieves updated code from the remote repository; 'push' posts your code to the remote repository.</h5><pre><code>git pull origin master
git push origin master</code></pre></div></div></div></div>
`;

test("project empty git repository matches legacy code/nohead.scala.html DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectCodeNoHead(page);

  await page.goto(`${basePath}/admin/sample/code`);
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Code");
  await expect(page.locator(".alert.alert-block h4")).toHaveText("The repository is empty!");
  await expect(page.locator("pre code")).toHaveCount(4);

  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(page, EXPECTED_NO_HEAD_BODY),
  );
});

async function mockProjectCodeNoHead(page: Page) {
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
        codeUrl: "http://admin@example.com/admin/sample",
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
  await page.route("**/api/v1/projects/admin/sample/code**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        branches: [],
        breadcrumbs: [],
        entries: [],
        file: null,
        noHead: true,
        ownerName: "admin",
        path: "",
        projectName: "sample",
        selectedBranch: "",
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
