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
const legacyUploadForm = new URL(
  "../../yona-original/app/views/common/uploadForm.scala.html",
  import.meta.url,
);
const legacyCreate = new URL(
  "../../yona-original/app/views/issue/create.scala.html",
  import.meta.url,
);
const legacyStyles = new URL(
  "../../yona-original/app/assets/stylesheets/less/_page.less",
  import.meta.url,
);
const legacyUiStyles = new URL(
  "../../yona-original/app/assets/stylesheets/less/_yobiUI.less",
  import.meta.url,
);
const appStyles = new URL("../src/app.css", import.meta.url);

test("issueform attachment rows own active React-matched StyleX geometry", async () => {
  const [route, style, uploader, uploadForm, create, less, uiLess, css] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacyUploader, "utf8"),
    readFile(legacyUploadForm, "utf8"),
    readFile(legacyCreate, "utf8"),
    readFile(legacyStyles, "utf8"),
    readFile(legacyUiStyles, "utf8"),
    readFile(appStyles, "utf8"),
  ]);

  expect(create).toContain("@common.fileUploader(ResourceType.ISSUE_POST, null)");
  expect(uploader).toContain('<li class="attached-file"');
  expect(uploader).toContain('class="name"');
  expect(uploader).toContain('class="btn-transparent btn-delete pull-right"');
  expect(uploadForm).toContain('class="help help-pastable"');
  expect(uploadForm).toContain('class="nbtn medium white fake-file-wrap"');
  expect(uploadForm).toContain('class="file"');
  expect(less).toContain(".upload-wrap {");
  expect(less).toContain(".attached-files {");
  expect(less).toContain(".attached-file {");
  expect(less).toContain(".btn-delete {");
  expect(uiLess).toContain(".fake-file-wrap {");
  expect(uiLess).toContain(".file {");

  for (const owner of [
    "attachedFilesVisible",
    "attachedFile",
    "attachedFileMain",
    "attachedFileMainDisabled",
    "attachedFileMainIcon",
    "attachedFileName",
    "uploadError",
    "attachedFileDelete",
    "uploadHelpPastable",
    "uploadFakeFile",
    "uploadFileInput",
    "uploadAttachSaveHelp",
    "attachedFileInsertCopy",
  ]) {
    expect(style).toContain(owner);
  }
  for (const owner of [
    "project-issue-form-attached-files",
    "project-issue-form-attached-file",
    "project-issue-form-attached-file-main",
    "project-issue-form-attached-file-main-icon",
    "project-issue-form-attached-file-name",
    "project-issue-form-upload-error",
    "project-issue-form-attached-file-delete",
    "project-issue-form-upload-help-pastable",
    "project-issue-form-upload-fake-file",
    "project-issue-form-upload-file-input",
    "project-issue-form-upload-attach-save-help",
    "project-issue-form-attached-file-insert-copy",
  ]) {
    expect(route).toContain(owner);
  }

  expect(css).not.toContain(".issue-form-page-wrap .attached-files.has-files");
  expect(css).not.toContain(".issue-form-page-wrap .attached-file {");
  expect(css).not.toContain(".issue-form-page-wrap .attached-file-main {");
  expect(css).not.toContain(".issue-form-page-wrap .attached-file-main:disabled {");
  expect(css).not.toContain(".issue-form-page-wrap .attached-file-main > i {");
  expect(css).not.toContain(".issue-form-page-wrap .attached-file-main .name {");
  expect(css).not.toContain(".issue-form-page-wrap .attached-file .upload-error {");
  expect(css).not.toContain(".issue-form-page-wrap .attached-file .btn-delete {");
  for (const retiredSelector of [
    ".issue-form-page-wrap #upload .help-pastable",
    ".issue-form-page-wrap #upload .fake-file-wrap.nbtn.medium",
    ".issue-form-page-wrap #upload .fake-file-wrap .file",
    ".issue-form-page-wrap #upload > .attach-save-help",
    ".issue-form-page-wrap .attached-file .btn-insert-copy",
  ]) {
    expect(css).not.toContain(`${retiredSelector} {`);
  }
  // Generic upload/fake-file and legacy `.attached-file` rules remain intentionally frozen.
  expect(css).toContain(".attached-file {");
  // The frozen uploader emits `.btn-insert`, but the current React owner emits
  // `.btn-insert-copy` and owns its ready-state presentation in StyleX. Keep
  // the generated/frozen legacy fallback intact while removing the dead app.css
  // bridge arms.
  for (const retiredSelector of [
    ".attached-file .btn-insert",
    ".attached-file .btn-insert:hover",
    ".attached-file.complete .btn-insert",
  ]) {
    expect(css).not.toContain(`${retiredSelector} {`);
  }
  expect(css).toContain(".attached-file.complete .progress {");
  expect(css).toContain(".write-comment-box .upload-wrap .help-pastable");
  expect(style).toContain('cursor: "default"');
  expect(style).toContain("opacity: 0.65");
  expect(style).toContain('display: "inline-block"');
  expect(style).toContain('width: "auto"');
  expect(style).toContain('margin: "0 3px 0 0"');
  expect(route).toContain('disabled={!row.attachment || row.status !== "ready"}');
  expect(route).toContain('row.status !== "ready" && issueFormStyles.attachedFileMainDisabled');
});
