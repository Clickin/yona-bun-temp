import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const routeSource = new URL(
  "../src/routes/$ownerName/$projectName/newMilestoneForm.tsx",
  import.meta.url,
);
const styleSource = new URL(
  "../src/routes/$ownerName/$projectName/-newMilestoneForm.stylex.ts",
  import.meta.url,
);
const legacyCreateSource = new URL(
  "../../yona-original/app/views/milestone/create.scala.html",
  import.meta.url,
);
const legacyUploadSource = new URL(
  "../../yona-original/app/views/common/uploadForm.scala.html",
  import.meta.url,
);

test("milestone upload paste help uses conditional StyleX", async () => {
  const [route, style, legacyCreate, legacyUpload] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacyCreateSource, "utf8"),
    readFile(legacyUploadSource, "utf8"),
  ]);

  expect(legacyCreate).toContain('id -> "milestone-form"');
  expect(legacyUpload).toContain("help-pastable");
  expect(route).toContain('data-stylex-owner="project-milestone-paste-help"');
  expect(route).toContain("pasteSupported");
  expect(route).not.toContain('style={pasteSupported ? { display: "block" } : undefined}');
  expect(style).toContain('pasteHelpVisible: { display: "block" }');
});
