import { expect, test, type Page } from "@playwright/test";

const EXPECTED_NO_HEAD_SVN_BODY = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="row-fluid"><div class="span12"><div class="alert alert-block"><h4>The repository is empty!</h4></div><h5>You can commit your code to this repository.</h5><pre><code>svn co http://example.com__BASE_PATH__/svn/admin/sample --username admin
cd sample/
echo "# sample" > README.md
svn add README.md
svn commit -m "first commit"</code></pre></div></div></div></div>
`;

test("project empty svn repository matches legacy code/nohead_svn.scala.html DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectCodeNoHeadSvn(page);

  await page.goto(`${basePath}/admin/sample/code`);
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Code");
  await expect(page.locator(".alert.alert-block h4")).toHaveText("The repository is empty!");
  await expect(page.locator("pre code")).toHaveCount(1);
  await expect(page.locator("pre code")).toContainText(
    `svn co http://example.com${basePath === "/" ? "" : basePath}/svn/admin/sample --username admin`,
  );
  await expect(page.locator("pre code")).not.toContainText(".git");
  await expect(page.locator("body")).not.toContainText("git clone");
  await expect(page.locator("body")).not.toContainText("git init");

  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_NO_HEAD_SVN_BODY.replace("__BASE_PATH__", basePath === "/" ? "" : basePath),
    ),
  );
  expect(await readNoHeadSvnMetrics(page)).toEqual({
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

test("live ko-KR empty svn code root keeps the legacy title and responsive shell geometry", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "language", { configurable: true, value: "ko-KR" });
    Object.defineProperty(navigator, "languages", { configurable: true, value: ["ko-KR"] });
  });
  await mockProjectCodeNoHeadSvn(page);

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/code`);
  await expect(page).toHaveTitle("커밋 히스토리 - admin/sample");
  await expect(page.locator(".project-menu-gruop li.active .menu-name")).toHaveText("코드");
  await expect(page.locator(".alert.alert-block h4")).toHaveText("저장소가 비어있습니다!");
  await expect(page.locator(".project-page-wrap h5")).toContainText("Yoram");
  await expect(page.locator(".project-page-wrap h5")).not.toContainText("Yona");
  await expect(page.locator(".project-util-wrap")).toContainText("그만 지켜보기");
  expect(await readNoHeadSvnShellMetrics(page)).toEqual({
    alertHeight: 80,
    alertWidth: 1346,
    pageHeight: 450,
    pageWidth: 1366,
    pageY: 213,
    projectWidth: 1346,
    utilWidth: 147,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await readNoHeadSvnShellMetrics(page)).toEqual({
    alertHeight: 80,
    alertWidth: 390,
    pageHeight: 450,
    pageWidth: 390,
    pageY: 213,
    projectWidth: 390,
    utilWidth: 15,
  });
});

test("empty svn checkout falls back to the browser origin for a relative API clone URL", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectCodeNoHeadSvn(page, "/admin/sample.git?transport=git#clone");

  await page.goto(`${basePath}/admin/sample/code`);
  const expectedCheckoutUrl = `${new URL(page.url()).origin}${basePath === "/" ? "" : basePath}/svn/admin/sample`;
  await expect(page.locator("pre code")).toContainText(
    `svn co ${expectedCheckoutUrl} --username admin`,
  );
  await expect(page.locator("pre code")).not.toContainText(".git");
  await expect(page.locator("pre code")).not.toContainText("transport=git");
  await expect(page.locator("pre code")).not.toContainText("#clone");
});

async function mockProjectCodeNoHeadSvn(
  page: Page,
  cloneUrl = "http://example.com/admin/sample.git?transport=git#clone",
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
        cloneUrl,
        enrollmentRequestCount: 0,
        id: 7,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        isWatching: true,
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
        vcs: "SVN",
        viewerCanWatch: true,
        viewerCanUpdate: true,
        viewerLoginId: "admin",
        watcherCount: 1,
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

async function readNoHeadSvnShellMetrics(page: Page) {
  return page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      const box = element.getBoundingClientRect();
      return {
        height: Math.round(box.height),
        width: Math.round(box.width),
        y: Math.round(box.y),
      };
    };
    const alert = rect(".alert.alert-block");
    const pageWrap = rect(".page-wrap-outer");
    const projectWrap = rect(".project-page-wrap");
    const util = rect(".project-util-wrap");
    return {
      alertHeight: alert.height,
      alertWidth: alert.width,
      pageHeight: pageWrap.height,
      pageWidth: pageWrap.width,
      pageY: pageWrap.y,
      projectWidth: projectWrap.width,
      utilWidth: util.width,
    };
  });
}

async function readNoHeadSvnMetrics(page: Page) {
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
      throw new Error(`Expected SVN no-head metric targets are missing: ${missing.join(", ")}`);
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
