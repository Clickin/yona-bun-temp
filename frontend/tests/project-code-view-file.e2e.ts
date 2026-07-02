import { expect, test, type Page } from "@playwright/test";

const EXPECTED_CODE_FILE_BODY = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="code-browse-wrap"><div class="code-browse-header"><select id="branches" data-toggle="select2" data-format="branch" data-dropdown-css-class="branches" class="pull-left mb10"><option value="__BASE_PATH__/admin/sample/code/main/README.txt" selected="">main</option><option value="__BASE_PATH__/admin/sample/code/feature%2Frelease/README.txt">feature/release</option></select><div id="breadcrumbs" class="code-breadcrumb-wrap ml10 pull-left"><a href="__BASE_PATH__/admin/sample/code/main">sample</a><a href="__BASE_PATH__/admin/sample/code/main/README.txt">README.txt</a></div><div class="pull-right"><a href="__BASE_PATH__/admin/sample/archive/main.zip" class="ybtn">Download as .zip file</a></div><div class="pull-right"><a id="new-file-link" href="__BASE_PATH__/admin/sample/postform?path=&amp;branch=main" class="ybtn">New file</a></div></div><div class="code-viewer-wrap"><div id="spin" style="position:fixed;top:50%;left:50%"></div><div class="file-wrap" data-type="file"><div class="file-header nm"><div id="fileInfo" class="file-info"><span id="commiter" class="commiter"><a href="__BASE_PATH__/admin" class="avatar-wrap" data-toggle="tooltip" data-placement="top" title="admin"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a><a href="__BASE_PATH__/admin" class="ml5">Admin</a></span><span id="commitDate" class="commitDate">Jul 2, 2026</span><span id="revisionNo" class="revision"><a href="__BASE_PATH__/admin/sample/commit/1234567890abcdef?branch=main#README.txt">1234567<span class="number-of-comments ml5"><i class="yobicon-comments"></i> 2</span></a></span><span id="commitMessage" class="commitMsg">Update README</span><span>LF</span></div><div class="pull-right"><a href="__BASE_PATH__/admin/sample/rawcode/main/README.txt" class="ybtn" target="_blank"><i class="yobicon-download-alt yobicon-white vmiddle"></i> Raw</a><a href="__BASE_PATH__/admin/sample/postform?path=README.txt&amp;branch=main&amp;edit=true" class="ybtn">Edit</a><a id="open-in-browser" href="__BASE_PATH__/admin/sample/files/main/README.txt" class="ybtn" target="_blank" data-content="Browser will parse and show this file. It is useful when you want to serve a static content file."><i class="yobicon-download-alt yobicon-white vmiddle"></i> Open in browser</a><a href="__BASE_PATH__/admin/sample/commits/main/README.txt" class="ybtn">Change history</a></div></div><div id="codeVal" class="hidden"># sample
Line two</div><pre id="showCode" class="code-wrap" data-mimeType="text/plain"></pre></div></div></div></div></div>
`;

const EXPECTED_NESTED_CODE_FILE_BODY = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="code-browse-wrap"><div class="code-browse-header"><select id="branches" data-toggle="select2" data-format="branch" data-dropdown-css-class="branches" class="pull-left mb10"><option value="__BASE_PATH__/admin/sample/code/main/docs/guide/README.txt" selected="">main</option><option value="__BASE_PATH__/admin/sample/code/feature%2Frelease/docs/guide/README.txt">feature/release</option></select><div id="breadcrumbs" class="code-breadcrumb-wrap ml10 pull-left"><a href="__BASE_PATH__/admin/sample/code/main">sample</a><a href="__BASE_PATH__/admin/sample/code/main/docs">docs</a><a href="__BASE_PATH__/admin/sample/code/main/docs/guide">guide</a><a href="__BASE_PATH__/admin/sample/code/main/docs/guide/README.txt">README.txt</a></div><div class="pull-right"><a href="__BASE_PATH__/admin/sample/archive/main.zip" class="ybtn">Download as .zip file</a></div><div class="pull-right"><a id="new-file-link" href="__BASE_PATH__/admin/sample/postform?path=docs/guide/&amp;branch=main" class="ybtn">New file</a></div></div><div class="code-viewer-wrap"><div id="spin" style="position:fixed;top:50%;left:50%"></div><div class="file-wrap" data-type="file"><div class="file-header nm"><div id="fileInfo" class="file-info"><span id="commiter" class="commiter"><a href="__BASE_PATH__/admin" class="avatar-wrap" data-toggle="tooltip" data-placement="top" title="admin"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a><a href="__BASE_PATH__/admin" class="ml5">Admin</a></span><span id="commitDate" class="commitDate">Jul 2, 2026</span><span id="revisionNo" class="revision"><a href="__BASE_PATH__/admin/sample/commit/1234567890abcdef?branch=main#docs/guide/README.txt">1234567<span class="number-of-comments ml5"><i class="yobicon-comments"></i> 2</span></a></span><span id="commitMessage" class="commitMsg">Update README</span><span>LF</span></div><div class="pull-right"><a href="__BASE_PATH__/admin/sample/rawcode/main/docs/guide/README.txt" class="ybtn" target="_blank"><i class="yobicon-download-alt yobicon-white vmiddle"></i> Raw</a><a href="__BASE_PATH__/admin/sample/postform?path=docs/guide/README.txt&amp;branch=main&amp;edit=true" class="ybtn">Edit</a><a id="open-in-browser" href="__BASE_PATH__/admin/sample/files/main/docs/guide/README.txt" class="ybtn" target="_blank" data-content="Browser will parse and show this file. It is useful when you want to serve a static content file."><i class="yobicon-download-alt yobicon-white vmiddle"></i> Open in browser</a><a href="__BASE_PATH__/admin/sample/commits/main/docs/guide/README.txt" class="ybtn">Change history</a></div></div><div id="codeVal" class="hidden"># sample
Line two</div><pre id="showCode" class="code-wrap" data-mimeType="text/plain"></pre></div></div></div></div></div>
`;

const EXPECTED_MARKDOWN_CODE_FILE_BODY = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="code-browse-wrap"><div class="code-browse-header"><select id="branches" data-toggle="select2" data-format="branch" data-dropdown-css-class="branches" class="pull-left mb10"><option value="__BASE_PATH__/admin/sample/code/main/README.md" selected="">main</option><option value="__BASE_PATH__/admin/sample/code/feature%2Frelease/README.md">feature/release</option></select><div id="breadcrumbs" class="code-breadcrumb-wrap ml10 pull-left"><a href="__BASE_PATH__/admin/sample/code/main">sample</a><a href="__BASE_PATH__/admin/sample/code/main/README.md">README.md</a></div><div class="pull-right"><a href="__BASE_PATH__/admin/sample/archive/main.zip" class="ybtn">Download as .zip file</a></div><div class="pull-right"><a id="new-file-link" href="__BASE_PATH__/admin/sample/postform?path=&amp;branch=main" class="ybtn">New file</a></div></div><div class="code-viewer-wrap"><div id="spin" style="position:fixed;top:50%;left:50%"></div><div class="file-wrap" data-type="file"><div class="file-header nm"><div id="fileInfo" class="file-info"><span id="commiter" class="commiter"><a href="__BASE_PATH__/admin" class="avatar-wrap" data-toggle="tooltip" data-placement="top" title="admin"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a><a href="__BASE_PATH__/admin" class="ml5">Admin</a></span><span id="commitDate" class="commitDate">Jul 2, 2026</span><span id="revisionNo" class="revision"><a href="__BASE_PATH__/admin/sample/commit/1234567890abcdef?branch=main#README.md">1234567<span class="number-of-comments ml5"><i class="yobicon-comments"></i> 2</span></a></span><span id="commitMessage" class="commitMsg">Update README</span><span>LF</span></div><div class="pull-right"><a href="__BASE_PATH__/admin/sample/rawcode/main/README.md" class="ybtn" target="_blank"><i class="yobicon-download-alt yobicon-white vmiddle"></i> Raw</a><a href="__BASE_PATH__/admin/sample/postform?path=README.md&amp;branch=main&amp;edit=true" class="ybtn">Edit</a><a id="open-in-browser" href="__BASE_PATH__/admin/sample/files/main/README.md" class="ybtn" target="_blank" data-content="Browser will parse and show this file. It is useful when you want to serve a static content file."><i class="yobicon-download-alt yobicon-white vmiddle"></i> Open in browser</a><a href="__BASE_PATH__/admin/sample/commits/main/README.md" class="ybtn">Change history</a></div></div><div id="codeVal" class="markdown-wrap codebrowser-markdown"><h1>sample</h1><p>Line two</p><p><img src="__BASE_PATH__/admin/sample/files/main/assets/logo.png"></p><p><a href="./docs/guide.md">Guide</a></p></div></div></div></div></div></div>
`;

const EXPECTED_IMAGE_CODE_FILE_BODY = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="code-browse-wrap"><div class="code-browse-header"><select id="branches" data-toggle="select2" data-format="branch" data-dropdown-css-class="branches" class="pull-left mb10"><option value="__BASE_PATH__/admin/sample/code/main/assets/logo.png" selected="">main</option><option value="__BASE_PATH__/admin/sample/code/feature%2Frelease/assets/logo.png">feature/release</option></select><div id="breadcrumbs" class="code-breadcrumb-wrap ml10 pull-left"><a href="__BASE_PATH__/admin/sample/code/main">sample</a><a href="__BASE_PATH__/admin/sample/code/main/assets">assets</a><a href="__BASE_PATH__/admin/sample/code/main/assets/logo.png">logo.png</a></div><div class="pull-right"><a href="__BASE_PATH__/admin/sample/archive/main.zip" class="ybtn">Download as .zip file</a></div><div class="pull-right"><a id="new-file-link" href="__BASE_PATH__/admin/sample/postform?path=assets/&amp;branch=main" class="ybtn">New file</a></div></div><div class="code-viewer-wrap"><div id="spin" style="position:fixed;top:50%;left:50%"></div><div class="file-wrap" data-type="file"><div class="file-header nm"><div id="fileInfo" class="file-info"><span id="commiter" class="commiter"><a href="__BASE_PATH__/admin" class="avatar-wrap" data-toggle="tooltip" data-placement="top" title="admin"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a><a href="__BASE_PATH__/admin" class="ml5">Admin</a></span><span id="commitDate" class="commitDate">Jul 2, 2026</span><span id="revisionNo" class="revision"><a href="__BASE_PATH__/admin/sample/commit/1234567890abcdef?branch=main#assets/logo.png">1234567<span class="number-of-comments ml5"><i class="yobicon-comments"></i> 2</span></a></span><span id="commitMessage" class="commitMsg">Update README</span><span></span></div><div class="pull-right"><a id="open-in-browser" href="__BASE_PATH__/admin/sample/files/main/assets/logo.png" class="ybtn" target="_blank" data-content="Browser will parse and show this file. It is useful when you want to serve a static content file."><i class="yobicon-download-alt yobicon-white vmiddle"></i> Open in browser</a><a href="__BASE_PATH__/admin/sample/commits/main/assets/logo.png" class="ybtn">Change history</a></div></div><div id="showImage" class="image-wrap"><img src="__BASE_PATH__/admin/sample/rawcode/main/assets/logo.png"></div></div></div></div></div></div>
`;

const EXPECTED_BINARY_CODE_FILE_BODY = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="code-browse-wrap"><div class="code-browse-header"><select id="branches" data-toggle="select2" data-format="branch" data-dropdown-css-class="branches" class="pull-left mb10"><option value="__BASE_PATH__/admin/sample/code/main/dist/archive.zip" selected="">main</option><option value="__BASE_PATH__/admin/sample/code/feature%2Frelease/dist/archive.zip">feature/release</option></select><div id="breadcrumbs" class="code-breadcrumb-wrap ml10 pull-left"><a href="__BASE_PATH__/admin/sample/code/main">sample</a><a href="__BASE_PATH__/admin/sample/code/main/dist">dist</a><a href="__BASE_PATH__/admin/sample/code/main/dist/archive.zip">archive.zip</a></div><div class="pull-right"><a href="__BASE_PATH__/admin/sample/archive/main.zip" class="ybtn">Download as .zip file</a></div><div class="pull-right"><a id="new-file-link" href="__BASE_PATH__/admin/sample/postform?path=dist/&amp;branch=main" class="ybtn">New file</a></div></div><div class="code-viewer-wrap"><div id="spin" style="position:fixed;top:50%;left:50%"></div><div class="file-wrap" data-type="file"><div class="file-header nm"><div id="fileInfo" class="file-info"><span id="commiter" class="commiter"><a href="__BASE_PATH__/admin" class="avatar-wrap" data-toggle="tooltip" data-placement="top" title="admin"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a><a href="__BASE_PATH__/admin" class="ml5">Admin</a></span><span id="commitDate" class="commitDate">Jul 2, 2026</span><span id="revisionNo" class="revision"><a href="__BASE_PATH__/admin/sample/commit/1234567890abcdef?branch=main#dist/archive.zip">1234567<span class="number-of-comments ml5"><i class="yobicon-comments"></i> 2</span></a></span><span id="commitMessage" class="commitMsg">Update README</span><span></span></div><div class="pull-right"><a id="open-in-browser" href="__BASE_PATH__/admin/sample/files/main/dist/archive.zip" class="ybtn" target="_blank" data-content="Browser will parse and show this file. It is useful when you want to serve a static content file."><i class="yobicon-download-alt yobicon-white vmiddle"></i> Open in browser</a><a href="__BASE_PATH__/admin/sample/commits/main/dist/archive.zip" class="ybtn">Change history</a></div></div><div id="showFile" class="file-wrap"><p><strong class="filename">archive.zip</strong><br><span class="filesize">12 KB</span><br><a href="__BASE_PATH__/admin/sample/rawcode/main/dist/archive.zip" class="filehref ybtn"><i class="yobicon-download-alt yobicon-white vmiddle"></i> Download a file</a></p></div></div></div></div></div></div>
`;

const EXPECTED_TOO_LARGE_CODE_FILE_BODY = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="code-browse-wrap"><div class="code-browse-header"><select id="branches" data-toggle="select2" data-format="branch" data-dropdown-css-class="branches" class="pull-left mb10"><option value="__BASE_PATH__/admin/sample/code/main/logs/big.txt" selected="">main</option><option value="__BASE_PATH__/admin/sample/code/feature%2Frelease/logs/big.txt">feature/release</option></select><div id="breadcrumbs" class="code-breadcrumb-wrap ml10 pull-left"><a href="__BASE_PATH__/admin/sample/code/main">sample</a><a href="__BASE_PATH__/admin/sample/code/main/logs">logs</a><a href="__BASE_PATH__/admin/sample/code/main/logs/big.txt">big.txt</a></div><div class="pull-right"><a href="__BASE_PATH__/admin/sample/archive/main.zip" class="ybtn">Download as .zip file</a></div><div class="pull-right"><a id="new-file-link" href="__BASE_PATH__/admin/sample/postform?path=logs/&amp;branch=main" class="ybtn">New file</a></div></div><div class="code-viewer-wrap"><div id="spin" style="position:fixed;top:50%;left:50%"></div><div class="file-wrap" data-type="file"><div class="file-header nm"><div id="fileInfo" class="file-info"><span id="commiter" class="commiter"><a href="__BASE_PATH__/admin" class="avatar-wrap" data-toggle="tooltip" data-placement="top" title="admin"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a><a href="__BASE_PATH__/admin" class="ml5">Admin</a></span><span id="commitDate" class="commitDate">Jul 2, 2026</span><span id="revisionNo" class="revision"><a href="__BASE_PATH__/admin/sample/commit/1234567890abcdef?branch=main#logs/big.txt">1234567<span class="number-of-comments ml5"><i class="yobicon-comments"></i> 2</span></a></span><span id="commitMessage" class="commitMsg">Update README</span><span></span></div><div class="pull-right"><a href="__BASE_PATH__/admin/sample/rawcode/main/logs/big.txt" class="ybtn" target="_blank"><i class="yobicon-download-alt yobicon-white vmiddle"></i> Raw</a><a href="__BASE_PATH__/admin/sample/postform?path=logs/big.txt&amp;branch=main&amp;edit=true" class="ybtn">Edit</a><a id="open-in-browser" href="__BASE_PATH__/admin/sample/files/main/logs/big.txt" class="ybtn" target="_blank" data-content="Browser will parse and show this file. It is useful when you want to serve a static content file."><i class="yobicon-download-alt yobicon-white vmiddle"></i> Open in browser</a><a href="__BASE_PATH__/admin/sample/commits/main/logs/big.txt" class="ybtn">Change history</a></div></div><p>Sorry, we cannot show a file larger than 1048576 bytes here.<br><a href="__BASE_PATH__/admin/sample/rawcode/main/logs/big.txt" target="_blank" class="filehref ybtn">View Raw</a></p></div></div></div></div></div>
`;

const EXPECTED_SVN_CODE_FILE_BODY = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="code-browse-wrap"><div class="code-browse-header"><select id="branches" data-toggle="select2" data-format="branch" data-dropdown-css-class="branches" class="pull-left mb10"><option value="__BASE_PATH__/admin/sample/code/trunk/README.txt" selected="">trunk</option><option value="__BASE_PATH__/admin/sample/code/branches%2Frelease/README.txt">branches/release</option></select><div id="breadcrumbs" class="code-breadcrumb-wrap ml10 pull-left"><a href="__BASE_PATH__/admin/sample/code/trunk">sample</a><a href="__BASE_PATH__/admin/sample/code/trunk/README.txt">README.txt</a></div></div><div class="code-viewer-wrap"><div id="spin" style="position:fixed;top:50%;left:50%"></div><div class="file-wrap" data-type="file"><div class="file-header nm"><div id="fileInfo" class="file-info"><span id="commiter" class="commiter"><a href="__BASE_PATH__/admin" class="avatar-wrap" data-toggle="tooltip" data-placement="top" title="admin"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a><a href="__BASE_PATH__/admin" class="ml5">Admin</a></span><span id="commitDate" class="commitDate">Jul 2, 2026</span><span id="revisionNo" class="revision"><a href="__BASE_PATH__/admin/sample/commit/42?branch=trunk#README.txt">Revision 42<span class="number-of-comments ml5"><i class="yobicon-comments"></i> 2</span></a></span><span id="commitMessage" class="commitMsg">Update README</span><span>LF</span></div><div class="pull-right"><a href="__BASE_PATH__/admin/sample/rawcode/42/README.txt" class="ybtn" target="_blank"><i class="yobicon-download-alt yobicon-white vmiddle"></i> Raw</a><a href="__BASE_PATH__/admin/sample/postform?path=README.txt&amp;branch=trunk&amp;edit=true" class="ybtn">Edit</a><a id="open-in-browser" href="__BASE_PATH__/admin/sample/files/42/README.txt" class="ybtn" target="_blank" data-content="Browser will parse and show this file. It is useful when you want to serve a static content file."><i class="yobicon-download-alt yobicon-white vmiddle"></i> Open in browser</a><a href="__BASE_PATH__/admin/sample/commits/trunk/README.txt" class="ybtn">Change history</a></div></div><div id="codeVal" class="hidden"># sample
Line two</div><pre id="showCode" class="code-wrap" data-mimeType="text/plain"></pre></div></div></div></div></div>
`;

test("project code text file matches legacy code/partial_view_file.scala.html DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const codeRequests: string[] = [];
  await mockProjectCodeFile(page, codeRequests, "README.txt");

  await page.goto(`${basePath}/admin/sample/code/main/README.txt`);
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Code");
  await expect(page.locator(".file-wrap[data-type=file] #commitMessage")).toHaveText(
    "Update README",
  );
  expect(codeRequests).toEqual(["branch=main&path=README.txt"]);
  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(page, EXPECTED_CODE_FILE_BODY.replaceAll("__BASE_PATH__", basePath)),
  );
  expect(await fileViewMetrics(page)).toEqual({
    breadcrumbDisplay: "block",
    breadcrumbFontSize: "15px",
    breadcrumbFontWeight: "700",
    breadcrumbLineHeight: "30px",
    breadcrumbPadding: "0px 10px 0px 0px",
    codeBorderStyle: "none",
    codeBorderRadius: "0px",
    codeLineHeight: "16px",
    codeMargin: "0px",
    codePadding: "0px",
    headerDisplay: "block",
    headerHeight: "34px",
    headerMarginBottom: "10px",
    headerMarginTop: "10px",
    viewerOverflow: "auto",
    viewerWidth: 1260,
    wrapPosition: "relative",
  });
});

async function fileViewMetrics(page: Page) {
  return page.locator(".code-browse-wrap").evaluate((wrap) => {
    const header = wrap.querySelector<HTMLElement>(".code-browse-header");
    const breadcrumb = wrap.querySelector<HTMLElement>(".code-breadcrumb-wrap");
    const viewer = wrap.querySelector<HTMLElement>(".code-viewer-wrap");
    const code = wrap.querySelector<HTMLElement>("#showCode.code-wrap");
    const missing = Object.entries({ breadcrumb, code, header, viewer })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(`Expected file view metric targets are missing: ${missing.join(", ")}`);
    }

    const breadcrumbStyle = window.getComputedStyle(breadcrumb);
    const codeStyle = window.getComputedStyle(code);
    const headerStyle = window.getComputedStyle(header);
    const viewerStyle = window.getComputedStyle(viewer);
    const wrapStyle = window.getComputedStyle(wrap);
    return {
      breadcrumbDisplay: breadcrumbStyle.display,
      breadcrumbFontSize: breadcrumbStyle.fontSize,
      breadcrumbFontWeight: breadcrumbStyle.fontWeight,
      breadcrumbLineHeight: breadcrumbStyle.lineHeight,
      breadcrumbPadding: breadcrumbStyle.padding,
      codeBorderRadius: codeStyle.borderRadius,
      codeBorderStyle: codeStyle.borderTopStyle,
      codeLineHeight: codeStyle.lineHeight,
      codeMargin: codeStyle.margin,
      codePadding: codeStyle.padding,
      headerDisplay: headerStyle.display,
      headerHeight: headerStyle.height,
      headerMarginBottom: headerStyle.marginBottom,
      headerMarginTop: headerStyle.marginTop,
      viewerOverflow: viewerStyle.overflow,
      viewerWidth: Math.round(viewer.getBoundingClientRect().width),
      wrapPosition: wrapStyle.position,
    };
  });
}

test("project code text file keeps nested legacy path segments", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const codeRequests: string[] = [];
  await mockProjectCodeFile(page, codeRequests, "docs/guide/README.txt");

  await page.goto(`${basePath}/admin/sample/code/main/docs/guide/README.txt`);
  await expect(page.locator(".file-wrap[data-type=file] #commitMessage")).toHaveText(
    "Update README",
  );
  expect(codeRequests).toEqual(["branch=main&path=docs%2Fguide%2FREADME.txt"]);
  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_NESTED_CODE_FILE_BODY.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project code markdown file matches legacy code browser markdown branch", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const codeRequests: string[] = [];
  await mockProjectCodeFile(
    page,
    codeRequests,
    "README.md",
    `# sample

Line two

![logo](${basePath}/admin/sample/files/main/assets/logo.png)

[Guide](./docs/guide.md)`,
  );

  await page.goto(`${basePath}/admin/sample/code/main/README.md`);
  await expect(page.locator("#codeVal.markdown-wrap.codebrowser-markdown")).toBeVisible();
  await expect(page.locator("#showCode")).toHaveCount(0);
  expect(codeRequests).toEqual(["branch=main&path=README.md"]);
  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_MARKDOWN_CODE_FILE_BODY.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project code image file matches legacy binary image branch", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const codeRequests: string[] = [];
  await mockProjectCodeFile(page, codeRequests, "assets/logo.png", "", {
    isBinary: true,
    lineEnding: "",
    mimeType: "image/png",
  });

  await page.goto(`${basePath}/admin/sample/code/main/assets/logo.png`);
  await expect(page.locator("#showImage.image-wrap img")).toHaveAttribute(
    "src",
    `${basePath}/admin/sample/rawcode/main/assets/logo.png`,
  );
  await expect(page.locator("#showCode")).toHaveCount(0);
  await expect(page.locator("#codeVal")).toHaveCount(0);
  await expect(page.locator(".file-header .pull-right a", { hasText: "Raw" })).toHaveCount(0);
  await expect(page.locator(".file-header .pull-right a", { hasText: "Edit" })).toHaveCount(0);
  expect(codeRequests).toEqual(["branch=main&path=assets%2Flogo.png"]);
  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_IMAGE_CODE_FILE_BODY.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project code binary file matches legacy download branch", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const codeRequests: string[] = [];
  await mockProjectCodeFile(page, codeRequests, "dist/archive.zip", "", {
    isBinary: true,
    lineEnding: "",
    mimeType: "application/zip",
    size: "12 KB",
  });

  await page.goto(`${basePath}/admin/sample/code/main/dist/archive.zip`);
  await expect(page.locator("#showFile.file-wrap .filename")).toHaveText("archive.zip");
  await expect(page.locator("#showFile.file-wrap .filesize")).toHaveText("12 KB");
  await expect(page.locator("#showFile.file-wrap .filehref")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/rawcode/main/dist/archive.zip`,
  );
  await expect(page.locator("#showCode")).toHaveCount(0);
  await expect(page.locator("#codeVal")).toHaveCount(0);
  expect(codeRequests).toEqual(["branch=main&path=dist%2Farchive.zip"]);
  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_BINARY_CODE_FILE_BODY.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project code too-large text file matches legacy raw fallback branch", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const codeRequests: string[] = [];
  await mockProjectCodeFile(page, codeRequests, "logs/big.txt", undefined, {
    data: undefined,
    lineEnding: "",
    size: 1048577,
  });

  await page.goto(`${basePath}/admin/sample/code/main/logs/big.txt`);
  await expect(page.locator(".file-wrap[data-type=file] > p .filehref")).toHaveText("View Raw");
  await expect(page.locator("#showCode")).toHaveCount(0);
  await expect(page.locator("#codeVal")).toHaveCount(0);
  expect(codeRequests).toEqual(["branch=main&path=logs%2Fbig.txt"]);
  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_TOO_LARGE_CODE_FILE_BODY.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project SVN code text file matches legacy code/view.scala.html file state", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const codeRequests: string[] = [];
  await mockProjectCodeFile(
    page,
    codeRequests,
    "README.txt",
    "# sample\nLine two",
    { commitId: "42" },
    { vcs: "SVN" },
    [{ name: "trunk" }, { name: "branches/release" }],
    "trunk",
  );

  await page.goto(`${basePath}/admin/sample/code/trunk/README.txt`);
  await expect(page.locator(".code-browse-header > .pull-right")).toHaveCount(0);
  await expect(page.locator("#revisionNo")).toContainText("Revision 42");
  expect(codeRequests).toEqual(["branch=trunk&path=README.txt"]);
  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(page, EXPECTED_SVN_CODE_FILE_BODY.replaceAll("__BASE_PATH__", basePath)),
  );
});

async function mockProjectCodeFile(
  page: Page,
  codeRequests: string[],
  filePath: string,
  data: string | undefined = "# sample\nLine two",
  fileOverrides: Record<string, unknown> = {},
  projectOverrides: Record<string, unknown> = {},
  branches: Array<{ name: string }> = [{ name: "main" }, { name: "feature/release" }],
  selectedBranch = "main",
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
        ...projectOverrides,
      }),
    });
  });
  await page.route("**/api/v1/projects/admin/sample/code**", async (route) => {
    const url = new URL(route.request().url());
    codeRequests.push(url.searchParams.toString());
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        branches,
        breadcrumbs: breadcrumbsFor(filePath),
        entries: [],
        file: {
          author: "Admin",
          avatarUrl: "/assets/images/default-avatar-32.png",
          commitId: "1234567890abcdef",
          commitMessage: "Update README",
          commentCount: 2,
          createdDate: "Jul 2, 2026",
          data,
          isBinary: false,
          lineEnding: "LF",
          mimeType: "text/plain",
          path: filePath,
          userLoginId: "admin",
          ...fileOverrides,
        },
        noHead: false,
        ownerName: "admin",
        path: filePath,
        projectName: "sample",
        selectedBranch,
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
