import { expect, test, type Page } from "@playwright/test";

const EXPECTED_EDIT_FORM_BODY = `
<div class="content-wrap frm-wrap"><form action="__BASE_PATH__/admin/sample/milestone/5" id="milestone-form" enctype="multipart/form-data"><div class="row-fluid"><div class="span12"><dl><dd><input type="text" id="title" name="title" value="v1.0" class="zen-mode text title " maxlength="250" tabindex="1" placeholder="Title"></dd></dl></div><div class="row-fluid"><div class="span9 span-left-pane"><dl><dd style="position:relative"><div data-toggle="markdown-editor" class="markdown-editor-wrap"><textarea id="editor-contents-content-body" name="contents" data-editor-mode="content-body" tabindex="2">Release scope</textarea><div id="preview-content-body" class="preview markdown-wrap"></div></div></dd></dl><div class="upload-wrap content-footer" data-resource-type="MILESTONE" data-resource-id="5"><div class="attach-wrap"><div class="attachments" id="attachments"></div></div></div><div class=" actrow right-txt"><button type="submit" class="ybtn ybtn-info">Save</button><a href="__BASE_PATH__/admin/sample/milestones" class="ybtn">Cancel</a></div></div><div class="span3 span-hard-wrap"><dl class="issue-option"><dt>Milestone status</dt><dd><div><input type="radio" name="state" value="OPEN" id="milestone-open" class="radio-btn" checked=""><label for="milestone-open" class="bold">Open</label>&nbsp;<input type="radio" name="state" value="CLOSED" id="milestone-close" class="radio-btn"><label for="milestone-close" class="bold">Closed</label></div></dd></dl><dl class="issue-option"><dt>Choose due date</dt><dd><div><label for="dueDate"><input type="text" name="dueDate" id="dueDate" class="validate due-date" value="2026-08-31"></label><div id="datepicker" class="date-picker"></div></div></dd></dl></div></div></div></form></div>
`;

test("project milestone edit form matches legacy milestone/edit.scala.html core form DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const patchRequests: unknown[] = [];
  await mockProjectMilestoneEditForm(page, patchRequests);

  await page.goto(`${basePath}/admin/sample/milestone/5/editform`);
  await expect(page.locator("#milestone-form")).toBeVisible();
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Milestone");
  await expect(page.locator("#milestone-open")).toBeChecked();
  await expect(page.locator("#dueDate")).toHaveValue("2026-08-31");

  expect(await canonicalize(page, ".content-wrap.frm-wrap")).toEqual(
    await canonicalizeHtml(page, EXPECTED_EDIT_FORM_BODY.replaceAll("__BASE_PATH__", basePath)),
  );
  expect(await readMilestoneEditFormMetrics(page)).toEqual({
    actionRowDisplay: "block",
    actionRowMarginTop: "20px",
    contentFooterBackground: "rgb(245, 245, 245)",
    contentFooterPadding: "10px 20px",
    contentWrapWidth: 1260,
    dueDateMinHeight: "30px",
    issueOptionDdMargin: "0px",
    issueOptionDtMarginBottom: "5px",
    issueOptionMarginBottom: "16px",
    issueOptionWidth: 295,
    leftPaneWidth: 938,
    rightPaneMarginLeft: 27,
    rightPaneWidth: 295,
    titleBorderBottomColor: "rgb(221, 221, 221)",
    titleFontSize: "18px",
    titleMarginBottom: "15px",
    titleMarginTop: "15px",
    titleWidth: 1222,
  });

  await page.fill("#title", "v1.0 patched");
  await page.check("#milestone-close");
  const patchResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/milestones/5") &&
      response.request().method() === "PATCH",
  );
  await page.click('#milestone-form button[type="submit"]');
  await patchResponsePromise;
  expect(patchRequests).toEqual([
    {
      attachmentIds: [],
      contentsMarkdown: "Release scope",
      dueDate: "2026-08-31",
      state: "CLOSED",
      title: "v1.0 patched",
    },
  ]);
});

async function mockProjectMilestoneEditForm(page: Page, patchRequests: unknown[]) {
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
  await page.route("**/api/v1/owners/admin/projects/sample/milestones/5", async (route) => {
    if (route.request().method() === "PATCH") {
      patchRequests.push(route.request().postDataJSON());
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        milestone: {
          attachments: [],
          closedIssueCount: 0,
          closedIssues: [],
          completionPercent: 0,
          contentsHtml: "<p>Release scope</p>",
          contentsMarkdown: "Release scope",
          dueDateLabel: "2026-08-31",
          id: 5,
          openIssueCount: 1,
          openIssues: [],
          state: "open",
          title: "v1.0",
          viewerCanDelete: true,
          viewerCanUpdate: true,
        },
      }),
    });
  });
}

async function readMilestoneEditFormMetrics(page: Page) {
  return page.evaluate(() => {
    const contentWrap = document.querySelector<HTMLElement>(".content-wrap.frm-wrap");
    const title = contentWrap?.querySelector<HTMLElement>("#title");
    const leftPane = contentWrap?.querySelector<HTMLElement>(".span-left-pane");
    const rightPane = contentWrap?.querySelector<HTMLElement>(".span-hard-wrap");
    const issueOption = contentWrap?.querySelector<HTMLElement>(".issue-option");
    const issueOptionDt = contentWrap?.querySelector<HTMLElement>(".issue-option dt");
    const issueOptionDd = contentWrap?.querySelector<HTMLElement>(".issue-option dd");
    const dueDate = contentWrap?.querySelector<HTMLElement>("#dueDate");
    const contentFooter = contentWrap?.querySelector<HTMLElement>(".content-footer");
    const actionRow = contentWrap?.querySelector<HTMLElement>(".span-left-pane > .actrow");
    const missing = Object.entries({
      actionRow,
      contentFooter,
      contentWrap,
      dueDate,
      issueOption,
      issueOptionDd,
      issueOptionDt,
      leftPane,
      rightPane,
      title,
    })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(
        `Expected milestone edit form metric targets are missing: ${missing.join(", ")}`,
      );
    }

    const actionRowStyle = getComputedStyle(actionRow);
    const contentFooterStyle = getComputedStyle(contentFooter);
    const issueOptionStyle = getComputedStyle(issueOption);
    const rightPaneStyle = getComputedStyle(rightPane);
    const titleStyle = getComputedStyle(title);
    return {
      actionRowDisplay: actionRowStyle.display,
      actionRowMarginTop: actionRowStyle.marginTop,
      contentFooterBackground: contentFooterStyle.backgroundColor,
      contentFooterPadding: contentFooterStyle.padding,
      contentWrapWidth: Math.round(contentWrap.getBoundingClientRect().width),
      dueDateMinHeight: getComputedStyle(dueDate).minHeight,
      issueOptionDdMargin: getComputedStyle(issueOptionDd).margin,
      issueOptionDtMarginBottom: getComputedStyle(issueOptionDt).marginBottom,
      issueOptionMarginBottom: issueOptionStyle.marginBottom,
      issueOptionWidth: Math.round(issueOption.getBoundingClientRect().width),
      leftPaneWidth: Math.round(leftPane.getBoundingClientRect().width),
      rightPaneMarginLeft: Math.round(Number.parseFloat(rightPaneStyle.marginLeft)),
      rightPaneWidth: Math.round(rightPane.getBoundingClientRect().width),
      titleBorderBottomColor: titleStyle.borderBottomColor,
      titleFontSize: titleStyle.fontSize,
      titleMarginBottom: titleStyle.marginBottom,
      titleMarginTop: titleStyle.marginTop,
      titleWidth: Math.round(title.getBoundingClientRect().width),
    };
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
      return `${open}${Array.from(node.childNodes)
        .map((child) => visit(child))
        .join("")}</${node.tagName.toLowerCase()}>`;
    }

    function normalizeText(text: string) {
      return text.replace(/\s+/g, " ").trim();
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
      return `${open}${Array.from(node.childNodes)
        .map((child) => visit(child))
        .join("")}</${node.tagName.toLowerCase()}>`;
    }

    function normalizeText(text: string) {
      return text.replace(/\s+/g, " ").trim();
    }

    function normalizeAttr(attr: Attr) {
      return attr.name === "style" ? attr.value.replace(/\s+/g, "").replace(/;$/u, "") : attr.value;
    }
  }, html);
}
