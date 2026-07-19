import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const routeSource = new URL("../src/routes/$ownerName/$projectName/issueform.tsx", import.meta.url);
const styleSource = new URL(
  "../src/routes/$ownerName/$projectName/-issueform.stylex.ts",
  import.meta.url,
);
const legacyCreateSource = new URL(
  "../../yona-original/app/views/issue/create.scala.html",
  import.meta.url,
);
const legacyUploaderSource = new URL(
  "../../yona-original/app/views/common/fileUploader.scala.html",
  import.meta.url,
);
const legacyUploadFormSource = new URL(
  "../../yona-original/app/views/common/uploadForm.scala.html",
  import.meta.url,
);
const legacyCommonStyles = new URL(
  "../../yona-original/app/assets/stylesheets/less/_common.less",
  import.meta.url,
);
const legacyPageStyles = new URL(
  "../../yona-original/app/assets/stylesheets/less/_page.less",
  import.meta.url,
);
const legacyResponsiveStyles = new URL(
  "../../yona-original/app/assets/stylesheets/less/_responsive.less",
  import.meta.url,
);
const legacyYobiStyles = new URL(
  "../../yona-original/app/assets/stylesheets/yobi.less",
  import.meta.url,
);
const appCssSource = new URL("../src/app.css", import.meta.url);

test("issue form upload progress shell owns static StyleX geometry", async () => {
  const [route, style, create, uploader, uploadForm, common, page, responsive, yobi, appCss] =
    await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(styleSource, "utf8"),
      readFile(legacyCreateSource, "utf8"),
      readFile(legacyUploaderSource, "utf8"),
      readFile(legacyUploadFormSource, "utf8"),
      readFile(legacyCommonStyles, "utf8"),
      readFile(legacyPageStyles, "utf8"),
      readFile(legacyResponsiveStyles, "utf8"),
      readFile(legacyYobiStyles, "utf8"),
      readFile(appCssSource, "utf8"),
    ]);

  expect(create).toContain("@common.fileUploader(ResourceType.ISSUE_POST, null)");
  expect(uploadForm).toContain('class="upload-wrap content-footer"');
  expect(uploader).toContain(
    '<div class="progress upload-progress"><div class="bar orange"></div></div>',
  );
  expect(common).toContain("height: 7px;");
  expect(common).toContain(".bar {");
  expect(page).toContain(".upload-progress");
  expect(page).toContain("display: inline-block;");
  expect(page).toContain(".upload-wrap {");
  expect(responsive).toContain("max-width: 720px");
  expect(yobi).toContain('@import "less/_page.less"');

  expect(style).toContain("uploadProgress:");
  expect(style).toContain("uploadShell:");
  expect(style).toContain('position: "relative"');
  expect(style).toContain('boxSizing: "border-box"');
  expect(style).toContain('default: "70px"');
  expect(style).toContain('padding: "10px"');
  expect(style).toContain("globalBreakpoints.mobile");
  expect(style).toContain('display: "inline-block"');
  expect(style).toContain('width: "100px"');
  expect(style).toContain('height: "7px"');
  expect(style).toContain('boxShadow: "inset 0 1px 1px rgb(0 0 0 / 25%)"');
  expect(style).toContain('backgroundColor: "#f36c22"');
  expect(style).toContain("uploadProgressBar: (width: string)");
  expect(route).toContain('data-stylex-owner="project-issue-form-upload-progress-shell"');
  expect(route).toContain('data-stylex-owner="project-issue-form-upload-shell"');
  expect(route).toContain('data-stylex-owner="project-issue-form-upload-progress"');
  expect(route).toContain("issueFormStyles.uploadProgressBar(`${row.progress}%`)");
  expect(appCss).not.toContain(".issue-form-page-wrap .attached-file .upload-progress {");
  expect(appCss).not.toContain(".issue-form-page-wrap .attached-file .upload-progress .bar {");
  expect(appCss).not.toContain(".issue-form-page-wrap #upload {");
});
