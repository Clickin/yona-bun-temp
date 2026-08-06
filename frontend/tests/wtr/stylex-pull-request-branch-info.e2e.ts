import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("pull request branch info owns static paint in StyleX", async () => {
  const route = readFileSync(
    new URL(
      "../src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  const style = readFileSync(
    new URL(
      "../src/routes/$ownerName/$projectName/pullRequest/-pull-request-detail.stylex.ts",
      import.meta.url,
    ),
    "utf8",
  );
  const legacy = readFileSync(
    new URL("../../yona-original/app/views/git/partial_branch.scala.html", import.meta.url),
    "utf8",
  );
  const css = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");
  expect(legacy).toContain("pullRequest-branchInfo");
  expect(route).toContain("styles.branchInfoCode");
  expect(route).toContain("styles.branchInfoLink");
  expect(route).toContain("styles.branchName");
  expect(style).toContain('color: "#2a7f8f"');
  expect(style).toContain('color: "#51aacc"');
  expect(style).toContain('fontSize: "12px"');
  expect(css).not.toContain(".pullRequest-branchInfo code {");
  expect(css).not.toContain(".pullRequest-branchInfo code a {");
  expect(css).not.toContain(".pullRequest-branchInfo i {");
});
