import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const routeSource = new URL(
  "../src/routes/$ownerName/$projectName/post/$postNumber/editform.tsx",
  import.meta.url,
);
const styleSource = new URL(
  "../src/routes/$ownerName/$projectName/post/$postNumber/-post-editform.stylex.ts",
  import.meta.url,
);
const legacyEditSource = new URL(
  "../../yona-original/app/views/board/edit.scala.html",
  import.meta.url,
);
const legacyUploaderSource = new URL(
  "../../yona-original/app/views/common/fileUploader.scala.html",
  import.meta.url,
);
const legacyUploadSource = new URL(
  "../../yona-original/app/views/common/uploadForm.scala.html",
  import.meta.url,
);

test("post edit upload paste help uses conditional StyleX", async () => {
  const [route, style, legacyEdit, legacyUploader, legacyUpload] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacyEditSource, "utf8"),
    readFile(legacyUploaderSource, "utf8"),
    readFile(legacyUploadSource, "utf8"),
  ]);

  expect(legacyEdit).toContain("common.fileUploader(ResourceType.BOARD_POST");
  expect(legacyUploader).toContain("common.uploadForm");
  expect(legacyUpload).toContain("help-pastable");
  expect(route).toContain('data-stylex-owner="post-edit-form-paste-help"');
  expect(route).toContain("pasteSupported");
  expect(route).not.toContain('style={pasteSupported ? { display: "block" } : undefined}');
  expect(style).toContain('pasteHelpVisible: { display: "block" }');
});
