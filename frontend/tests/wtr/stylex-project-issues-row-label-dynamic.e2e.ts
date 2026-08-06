import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: node:fs/promises readFile has no browser equivalent; the
// compat readFileSync is a sync XHR over the same middleware. Promise-wrap it
// so the spec's await/Promise.all call sites keep their shape.
const readFile = (path: string | URL, encoding?: string | null): Promise<string> =>
  Promise.resolve(readFileSync(path, encoding ?? "utf8"));

// String fixture paths (the WTR readFileSync maps ../src/ + ../yona-original/
// roots and serves them raw; node resolves them from the spec file).
const routeSource = "../src/routes/$ownerName/$projectName/issues.tsx";
const styleSource = "../src/routes/$ownerName/$projectName/-issues.stylex.ts";
const legacySource = "../yona-original/app/views/issue/partial_list.scala.html";

test("project issues row hover and child-label colors use Dynamic StyleX", async () => {
  const [route, style, legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);
  expect(legacy).toContain("issue-label");
  expect(route).toContain("styles.issueRowHoverBackground");
  expect(route).toContain("childIssueLabelStyle(label.color)");
  expect(route).not.toContain("style={childIssueLabelStyle");
  expect(style).toContain("issueRowHoverBackground: (backgroundColor: string)");
  expect(style).not.toContain("childLabelBackground:");
});
