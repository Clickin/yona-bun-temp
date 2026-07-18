import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const routeSource = new URL("../src/routes/$ownerName/$projectName/issueform.tsx", import.meta.url);
const styleSource = new URL(
  "../src/routes/$ownerName/$projectName/-issueform.stylex.ts",
  import.meta.url,
);
const legacyUploader = new URL(
  "../../yona-original/app/views/common/fileUploader.scala.html",
  import.meta.url,
);
const legacyStyles = new URL(
  "../../yona-original/app/assets/stylesheets/less/_page.less",
  import.meta.url,
);
const appStyles = new URL("../src/app.css", import.meta.url);

test("issueform attachment rows own active React-matched StyleX geometry", async () => {
  const [route, style, uploader, less, css] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacyUploader, "utf8"),
    readFile(legacyStyles, "utf8"),
    readFile(appStyles, "utf8"),
  ]);

  expect(uploader).toContain('<li class="attached-file"');
  expect(uploader).toContain('class="name"');
  expect(uploader).toContain('class="btn-transparent btn-delete pull-right"');
  expect(less).toContain(".attached-files {");
  expect(less).toContain(".attached-file {");
  expect(less).toContain(".btn-delete {");

  for (const owner of [
    "attachedFilesVisible",
    "attachedFile",
    "attachedFileMain",
    "attachedFileName",
    "uploadError",
    "attachedFileDelete",
  ]) {
    expect(style).toContain(owner);
  }
  for (const owner of [
    "project-issue-form-attached-files",
    "project-issue-form-attached-file",
    "project-issue-form-attached-file-main",
    "project-issue-form-attached-file-name",
    "project-issue-form-upload-error",
    "project-issue-form-attached-file-delete",
  ]) {
    expect(route).toContain(owner);
  }

  expect(css).not.toContain(".issue-form-page-wrap .attached-files.has-files");
  expect(css).not.toContain(".issue-form-page-wrap .attached-file {");
  expect(css).not.toContain(".issue-form-page-wrap .attached-file-main {");
  expect(css).not.toContain(".issue-form-page-wrap .attached-file-main .name {");
  expect(css).not.toContain(".issue-form-page-wrap .attached-file .upload-error {");
  expect(css).not.toContain(".issue-form-page-wrap .attached-file .btn-delete {");
  // Generic upload/fake-file and legacy `.attached-file` rules remain intentionally frozen.
  expect(css).toContain(".attached-file {");
});
