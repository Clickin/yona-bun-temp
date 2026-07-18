import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const routeSource = new URL("../src/routes/$ownerName/$projectName/issues.tsx", import.meta.url);
const styleSource = new URL(
  "../src/routes/$ownerName/$projectName/-issues.stylex.ts",
  import.meta.url,
);
const legacySource = new URL(
  "../../yona-original/app/views/issue/partial_list.scala.html",
  import.meta.url,
);

test("project issues row hover and child-label colors use Dynamic StyleX", async () => {
  const [route, style, legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);
  expect(legacy).toContain("issue-label");
  expect(route).toContain("styles.issueRowHoverBackground");
  expect(route).toContain("styles.childLabelBackground");
  expect(route).not.toContain("style={childIssueLabelStyle");
  expect(style).toContain("issueRowHoverBackground: (backgroundColor: string)");
  expect(style).toContain("childLabelBackground: (backgroundColor: string)");
});
