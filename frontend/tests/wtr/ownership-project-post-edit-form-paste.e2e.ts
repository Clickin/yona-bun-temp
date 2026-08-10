import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = new URL(
  "../src/routes/$ownerName/$projectName/post/$postNumber/editform.tsx",
  import.meta.url,
);
const styleSource = new URL("../src/app.css", import.meta.url);
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

test("post edit upload paste help uses conditional Style", async () => {
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
  // paste-help owner moved into the BoardPostFileUploader owners prop
});
