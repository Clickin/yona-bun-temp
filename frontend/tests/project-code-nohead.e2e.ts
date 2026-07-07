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
  await assertProjectSearchShell(page, basePath);
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Code");
  await expect(page.locator(".alert.alert-block h4")).toHaveText("The repository is empty!");
  await expect(page.locator("pre code")).toHaveCount(4);

  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(page, EXPECTED_NO_HEAD_BODY),
  );
  expect(await readNoHeadMetrics(page)).toEqual({
    alertPaddingBottom: "14px",
    alertPaddingTop: "14px",
    alertTitleFontSize: "17.5px",
    codeBackground: "rgba(0, 0, 0, 0)",
    codeColor: "rgb(51, 51, 51)",
    codePadding: "0px",
    codeWhiteSpace: "pre-wrap",
    firstHeadingFontSize: "14px",
    firstHeadingMarginBottom: "10px",
    preBackground: "rgb(245, 245, 245)",
    preBorderRadius: "4px",
    preBorderTopWidth: "1px",
    preLineHeight: "20px",
    preMarginBottom: "10px",
    prePadding: "9.5px",
    preWhiteSpace: "pre-wrap",
    rowWidthPercent: 100,
    spanMarginLeft: "0px",
    spanMinHeight: "30px",
    spanWidthPercent: 100,
  });
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
        isProtected: true,
        logoUrl: "/assets/images/project_default_logo.png",
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        organizationName: "admin",
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

async function assertProjectSearchShell(page: Page, basePath: string) {
  await expect(page.locator(".gnb-outer.project-header")).toHaveCount(1);
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(page.locator(".gnb-search-form .search-box")).toHaveClass("search-box select");

  const currentUrl = `${basePath}/admin/sample/code`;
  const projectScope = page.locator('[data-toggle="search-scope"]', { hasText: "This Project" });
  const groupScope = page.locator('[data-toggle="search-scope"]', { hasText: "This Group" });
  const allScope = page.locator('[data-toggle="search-scope"]', { hasText: "All Projects" });
  await expect(projectScope).toHaveAttribute("data-action", `${basePath}/admin/sample/search`);
  await expect(groupScope).toHaveAttribute("data-action", `${basePath}/organizations/admin/search`);
  await expect(allScope).toHaveAttribute("data-action", `${basePath}/search`);

  await page.locator("#gnb-search-scope-title").click();
  await groupScope.click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Group");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/organizations/admin/search`,
  );
  await expect(page).toHaveURL(currentUrl);

  await page.locator("#gnb-search-scope-title").click();
  await allScope.click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("All Projects");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute("action", `${basePath}/search`);
  await expect(page).toHaveURL(currentUrl);

  await page.locator("#gnb-search-scope-title").click();
  await projectScope.click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/search`,
  );
  await expect(page).toHaveURL(currentUrl);

  const boxes = await page.evaluate(() => {
    const navbar = document.querySelector(".gnb-outer.project-header");
    const form = document.querySelector(".gnb-search-form");
    const searchBox = document.querySelector(".gnb-search-form .search-box");
    const scopeButton = document.querySelector("#gnb-search-scope-title");
    const input = document.querySelector('.gnb-search-form input[name="keyword"]');
    const submit = document.querySelector('.gnb-search-form button[type="submit"]');
    if (!navbar || !form || !searchBox || !scopeButton || !input || !submit) {
      return null;
    }
    const rect = (element: Element) => {
      const box = element.getBoundingClientRect();
      return {
        bottom: box.bottom,
        height: box.height,
        left: box.left,
        right: box.right,
        top: box.top,
        width: box.width,
      };
    };
    return {
      form: rect(form),
      input: rect(input),
      navbar: rect(navbar),
      scopeButton: rect(scopeButton),
      searchBox: rect(searchBox),
      submit: rect(submit),
    };
  });
  expect(boxes).not.toBeNull();
  expect(boxes!.form.top).toBeGreaterThanOrEqual(boxes!.navbar.top);
  expect(boxes!.form.bottom).toBeLessThanOrEqual(boxes!.navbar.bottom);
  expect(boxes!.form.right).toBeLessThanOrEqual(boxes!.navbar.right);
  expect(boxes!.scopeButton.top).toBeGreaterThanOrEqual(boxes!.navbar.top);
  expect(boxes!.scopeButton.bottom).toBeLessThanOrEqual(boxes!.navbar.bottom);
  expect(boxes!.searchBox.top).toBeGreaterThanOrEqual(boxes!.navbar.top);
  expect(boxes!.searchBox.bottom).toBeLessThanOrEqual(boxes!.navbar.bottom);
  expect(boxes!.input.top).toBeGreaterThanOrEqual(boxes!.searchBox.top);
  expect(boxes!.input.bottom).toBeLessThanOrEqual(boxes!.searchBox.bottom);
  expect(boxes!.submit.top).toBeGreaterThanOrEqual(boxes!.searchBox.top);
  expect(boxes!.submit.bottom).toBeLessThanOrEqual(boxes!.searchBox.bottom);
  expect(boxes!.scopeButton.right).toBeLessThanOrEqual(boxes!.searchBox.left + 1);
  expect(boxes!.searchBox.right).toBeLessThanOrEqual(boxes!.form.right);
}

async function readNoHeadMetrics(page: Page) {
  return page.locator(".page-wrap-outer").evaluate((root) => {
    const projectWrap = root.querySelector<HTMLElement>(".project-page-wrap");
    const row = root.querySelector<HTMLElement>(".row-fluid");
    const span = root.querySelector<HTMLElement>(".span12");
    const alert = root.querySelector<HTMLElement>(".alert.alert-block");
    const alertTitle = alert?.querySelector<HTMLElement>("h4");
    const firstHeading = root.querySelector<HTMLElement>("h5");
    const firstPre = root.querySelector<HTMLElement>("pre");
    const firstCode = firstPre?.querySelector<HTMLElement>("code");
    const missing = Object.entries({
      alert,
      alertTitle,
      firstCode,
      firstHeading,
      firstPre,
      projectWrap,
      row,
      span,
    })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(`Expected no-head metric targets are missing: ${missing.join(", ")}`);
    }

    const spanStyle = getComputedStyle(span!);
    const alertStyle = getComputedStyle(alert!);
    const alertTitleStyle = getComputedStyle(alertTitle!);
    const headingStyle = getComputedStyle(firstHeading!);
    const preStyle = getComputedStyle(firstPre!);
    const codeStyle = getComputedStyle(firstCode!);
    const projectWidth = projectWrap!.getBoundingClientRect().width;
    const rowWidthPercent =
      Math.round((row!.getBoundingClientRect().width / projectWidth) * 1000) / 10;
    const spanWidthPercent =
      Math.round(
        (span!.getBoundingClientRect().width / row!.getBoundingClientRect().width) * 1000,
      ) / 10;

    return {
      alertPaddingBottom: alertStyle.paddingBottom,
      alertPaddingTop: alertStyle.paddingTop,
      alertTitleFontSize: alertTitleStyle.fontSize,
      codeBackground: codeStyle.backgroundColor,
      codeColor: codeStyle.color,
      codePadding: codeStyle.padding,
      codeWhiteSpace: codeStyle.whiteSpace,
      firstHeadingFontSize: headingStyle.fontSize,
      firstHeadingMarginBottom: headingStyle.marginBottom,
      preBackground: preStyle.backgroundColor,
      preBorderRadius: preStyle.borderRadius,
      preBorderTopWidth: preStyle.borderTopWidth,
      preLineHeight: preStyle.lineHeight,
      preMarginBottom: preStyle.marginBottom,
      prePadding: preStyle.padding,
      preWhiteSpace: preStyle.whiteSpace,
      rowWidthPercent,
      spanMarginLeft: spanStyle.marginLeft,
      spanMinHeight: spanStyle.minHeight,
      spanWidthPercent,
    };
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
