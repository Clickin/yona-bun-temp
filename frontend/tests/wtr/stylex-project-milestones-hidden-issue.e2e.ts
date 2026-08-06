import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";
const routeSource = new URL(
  "../src/routes/$ownerName/$projectName/milestones.tsx",
  import.meta.url,
);
const legacySource = new URL(
  "../../yona-original/app/views/milestone/list.scala.html",
  import.meta.url,
);
test("project milestone filtered issue links use conditional StyleX", async () => {
  const [route, legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);
  expect(route).toContain('"project-milestones-hidden-issue-link"');
  expect(route).toContain("hiddenIssueLink");
});
