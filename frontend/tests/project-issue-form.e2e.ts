import { expect, test, type Page } from "@playwright/test";

const EXPECTED_ISSUE_FORM_BODY = `
<div class="content-wrap frm-wrap"><form action="__BASE_PATH__/admin/sample/issues" id="issue-form" enctype="multipart/form-data"><div class="row-fluid"><div class="span12"><dl><dd><div class="span12"><div class="span11"><input type="text" id="title" name="title" value="" class="text title " maxlength="250" tabindex="1" placeholder="Title" autocomplete="off" title="press Tab or Enter to move cursor to content area"></div><div class="span1 subtask-message">Option</div></div><div class="subtask-wrap "><div class="span3"><select id="targetProjectId" name="targetProjectId" data-format="projects" data-placeholder="Choose projects" data-toggle="select2" data-container-css-class="fullsize" disabled=""><option value="7" data-avatar-url="/assets/images/project_default_logo.png">sample</option></select></div><div class="span6"><select id="parentId" name="parentIssueId" data-format="issues" data-placeholder="Choose projects" data-toggle="select2" data-container-css-class="fullsize" disabled=""><option value="" selected="">??? Select parent issue ???</option><option value="42">#11.Existing parent</option></select></div></div></dd></dl></div><div class="row-fluid"><div class="span9 span-left-pane"><dl><dd style="position:relative"><div data-toggle="markdown-editor" class="markdown-editor-wrap"><textarea id="editor-body-content-body" name="body" data-editor-mode="content-body" tabindex="2"></textarea><div id="preview-content-body" class="preview markdown-wrap"></div></div></dd></dl><div class="upload-wrap content-footer" data-resource-type="ISSUE_POST"><div class="attach-wrap"><div class="attachments" id="attachments"></div></div></div><div class="actrow right-txt"><button type="submit" id="button-save" class="ybtn ybtn-success">Save</button><button type="button" id="draft-save-btn" class="ybtn ybtn-watching draft-save-btn">Draft Save</button><a href="javascript:history.back();" class="ybtn">Cancel</a></div></div><div class="span3 span-hard-wrap right-menu"><dl class="issue-option"><dt>Assignee</dt><dd><input type="hidden" class="bigdrop" id="assignee" name="assigneeLoginId" placeholder="No assignee" value="" style="width:100%" title=""></dd></dl><dl class="issue-option"><dt>Due date</dt><dd><div class="search search-bar"><input type="text" id="issueDueDate" data-toggle="calendar" name="dueDate" class="textbox full"><button type="button" class="search-btn btn-calendar"><i class="yobicon-calendar2"></i></button></div></dd></dl><dl class="issue-option"><dt>Label <a href="__BASE_PATH__/admin/sample/issue/labelsform" target="_blank" class="label-edit">[Edit]</a></dt><dd><select id="labelIds" name="labelIds" multiple="" data-search="labelIds" data-toggle="select2" data-format="issuelabel" data-allow-clear="true" data-dropdown-css-class="issue-labels" data-container-css-class="issue-labels bordered fullsize" data-placeholder="Select label" data-close-on-select="false" class="hide"><option></option><optgroup label="type" data-category-id="3" data-category-is-exclusive="false"><option value="8" data-category-id="3" data-category-is-exclusive="false">bug</option></optgroup></select></dd></dl><input type="hidden" name="referCommentId" value=""><input type="hidden" id="isDraft" name="isDraft" value="false"></div></div></div></form></div>
`;

const EXPECTED_PARENT_ISSUE_FORM_BODY = `
<div class="content-wrap frm-wrap"><form action="__BASE_PATH__/admin/sample/issues" id="issue-form" enctype="multipart/form-data"><div class="row-fluid"><div class="span12"><dl><dd><div class="span12"><div class="span11"><input type="text" id="title" name="title" value="" class="text title " maxlength="250" tabindex="1" placeholder="Title" autocomplete="off" title="press Tab or Enter to move cursor to content area"></div><div class="span1 subtask-message">Option</div></div><div class="subtask-wrap show"><div class="span3"><select id="targetProjectId" name="targetProjectId" data-format="projects" data-placeholder="Choose projects" data-toggle="select2" data-container-css-class="fullsize"><option value="7" data-avatar-url="/assets/images/project_default_logo.png">sample</option></select></div><div class="span6"><select id="parentId" name="parentIssueId" data-format="issues" data-placeholder="Choose projects" data-toggle="select2" data-container-css-class="fullsize"><option value="">??? Select parent issue ???</option><option value="42" selected="">#11.Existing parent</option></select></div></div></dd></dl></div><div class="row-fluid"><div class="span9 span-left-pane"><dl><dd style="position:relative"><div data-toggle="markdown-editor" class="markdown-editor-wrap"><textarea id="editor-body-content-body" name="body" data-editor-mode="content-body" tabindex="2"></textarea><div id="preview-content-body" class="preview markdown-wrap"></div></div></dd></dl><div class="upload-wrap content-footer" data-resource-type="ISSUE_POST"><div class="attach-wrap"><div class="attachments" id="attachments"></div></div></div><div class="actrow right-txt"><button type="submit" id="button-save" class="ybtn ybtn-success">Save</button><button type="button" id="draft-save-btn" class="ybtn ybtn-watching draft-save-btn">Draft Save</button><a href="javascript:history.back();" class="ybtn">Cancel</a></div></div><div class="span3 span-hard-wrap right-menu"><dl class="issue-option"><dt>Assignee</dt><dd><input type="hidden" class="bigdrop" id="assignee" name="assigneeLoginId" placeholder="No assignee" value="" style="width:100%" title=""></dd></dl><dl class="issue-option"><dt>Due date</dt><dd><div class="search search-bar"><input type="text" id="issueDueDate" data-toggle="calendar" name="dueDate" class="textbox full"><button type="button" class="search-btn btn-calendar"><i class="yobicon-calendar2"></i></button></div></dd></dl><dl class="issue-option"><dt>Label <a href="__BASE_PATH__/admin/sample/issue/labelsform" target="_blank" class="label-edit">[Edit]</a></dt><dd><select id="labelIds" name="labelIds" multiple="" data-search="labelIds" data-toggle="select2" data-format="issuelabel" data-allow-clear="true" data-dropdown-css-class="issue-labels" data-container-css-class="issue-labels bordered fullsize" data-placeholder="Select label" data-close-on-select="false" class="hide"><option></option><optgroup label="type" data-category-id="3" data-category-is-exclusive="false"><option value="8" data-category-id="3" data-category-is-exclusive="false">bug</option></optgroup></select></dd></dl><input type="hidden" name="referCommentId" value="55"><input type="hidden" id="isDraft" name="isDraft" value="false"></div></div></div></form></div>
`;

test("project issue create form matches legacy issue/create.scala.html core form DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueForm(page);

  await page.goto(`${basePath}/admin/sample/issueform`);
  await expect(page.locator("#issue-form")).toBeVisible();
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Issue");
  await expect(page.locator("#labelIds")).toHaveAttribute("data-close-on-select", "false");
  await expect(page.locator("#labelIds optgroup")).toHaveAttribute(
    "data-category-is-exclusive",
    "false",
  );

  expect(await canonicalize(page, ".content-wrap.frm-wrap")).toEqual(
    await canonicalizeHtml(page, EXPECTED_ISSUE_FORM_BODY.replaceAll("__BASE_PATH__", basePath)),
  );
});

test("project issue create form parent state matches legacy partial_select_subtask.scala.html", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueForm(page);

  await page.goto(`${basePath}/admin/sample/issueform?parentIssueId=42&commentId=55`);
  await expect(page.locator(".subtask-wrap")).toHaveClass("subtask-wrap show");
  await expect(page.locator("#targetProjectId")).toBeEnabled();
  await expect(page.locator("#parentId")).toHaveValue("42");
  await expect(page.locator("#targetProjectId option")).toHaveAttribute(
    "data-avatar-url",
    "/assets/images/project_default_logo.png",
  );

  expect(await canonicalize(page, ".content-wrap.frm-wrap")).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_PARENT_ISSUE_FORM_BODY.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

async function mockProjectIssueForm(page: Page) {
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
  await page.route("**/api/v1/owners/admin/projects/sample/labels", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        labels: [
          {
            categoryId: "3",
            categoryIsExclusive: false,
            categoryName: "type",
            color: "#51aacc",
            id: "8",
            name: "bug",
          },
        ],
      }),
    });
  });
  await page.route("**/api/v1/projects/admin/sample/issues/parent-options**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items: [{ id: 42, issueNumber: 11, selected: false, title: "Existing parent" }],
      }),
    });
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
