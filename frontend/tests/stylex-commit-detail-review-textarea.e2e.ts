import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
const routeSource = new URL(
  "../src/routes/$ownerName/$projectName/commit/$commitId.tsx",
  import.meta.url,
);
const styleSource = new URL(
  "../src/routes/$ownerName/$projectName/commit/-commit-detail.stylex.ts",
  import.meta.url,
);
const legacySource = new URL("../../yona-original/app/views/code/diff.scala.html", import.meta.url);
test("commit review textarea height uses conditional StyleX", async () => {
  const [route, style, legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);
  expect(route).toContain('"commit-detail-review-textarea"');
  expect(route).toContain("reviewTextarea");
  expect(route).not.toContain('textareaStyle={{ height: "100px" }}');
  expect(style).toContain('reviewTextarea: { height: "100px" }');
});
