import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = new URL(
  "../src/routes/$ownerName/$projectName/newMilestoneForm.tsx",
  import.meta.url,
);
const styleSource = new URL("../src/app.css", import.meta.url);
const legacyCreateSource = new URL(
  "../../yona-original/app/views/milestone/create.scala.html",
  import.meta.url,
);
const legacyUploadSource = new URL(
  "../../yona-original/app/views/common/uploadForm.scala.html",
  import.meta.url,
);

test("milestone upload paste help uses conditional Style", async () => {
  const [route, style, legacyCreate, legacyUpload] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacyCreateSource, "utf8"),
    readFile(legacyUploadSource, "utf8"),
  ]);

  expect(legacyCreate).toContain('id -> "milestone-form"');
  expect(legacyUpload).toContain("help-pastable");
});
