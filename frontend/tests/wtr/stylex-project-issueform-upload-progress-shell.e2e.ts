import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = "../src/routes/$ownerName/$projectName/issueform.tsx";
const styleSource = "../src/routes/$ownerName/$projectName/-issueform.stylex.ts";
const legacyCreateSource = "../yona-original/app/views/issue/create.scala.html";
const legacyUploaderSource = "../yona-original/app/views/common/fileUploader.scala.html";
const legacyUploadFormSource = "../yona-original/app/views/common/uploadForm.scala.html";
const legacyCommonStyles = "../yona-original/app/assets/stylesheets/less/_common.less";
const legacyPageStyles = "../yona-original/app/assets/stylesheets/less/_page.less";
const legacyResponsiveStyles = "../yona-original/app/assets/stylesheets/less/_responsive.less";
const legacyYobiStyles = "../yona-original/app/assets/stylesheets/yobi.less";
const appCssSource = "../src/app.css";

test("issue form upload progress shell owns static StyleX geometry", async () => {
  const [
    route,
    style,
    create,
    uploader,
    uploadForm,
    common,
    page,
    responsive,
    yobi,
    appCss,
    uploaderSource,
  ] = await Promise.all([
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
    readFile("../src/components/file-uploader.tsx", "utf8"),
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
  expect(uploaderSource).toContain('data-stylex-owner="project-issue-form-upload-progress-shell"');
  expect(uploaderSource).toContain('owner="project-issue-form-upload-shell"');
  expect(uploaderSource).toContain('data-stylex-owner="project-issue-form-upload-progress"');
  expect(uploaderSource).toContain("uploadProgressBar(`${row.progress}%`)");
  expect(appCss).not.toContain(".issue-form-page-wrap .attached-file .upload-progress {");
  expect(appCss).not.toContain(".issue-form-page-wrap .attached-file .upload-progress .bar {");
  expect(appCss).not.toContain(".issue-form-page-wrap #upload {");
});
