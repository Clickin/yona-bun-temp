import { expect, test, type Page } from "@playwright/test";

const EXPECTED_NO_HEAD_SVN_BODY = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="row-fluid"><div class="span12"><div class="alert alert-block"><h4>The repository is empty!</h4></div><h5>You can commit your code to this repository.</h5><pre><code>svn co http://example.com/svn/admin/sample --username admin
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
  await expect(page.locator("body")).not.toContainText("git clone");
  await expect(page.locator("body")).not.toContainText("git init");

  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(page, EXPECTED_NO_HEAD_SVN_BODY),
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

async function mockProjectCodeNoHeadSvn(page: Page) {
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
        codeUrl: "http://example.com/svn/admin/sample",
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
        vcs: "SVN",
        viewerCanUpdate: true,
        viewerLoginId: "admin",
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
