import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("pull request conflict guide owns conditional static styling", async () => {
  const route = await readFile(
    new URL(
      "../src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  const styles = await readFile(
    new URL(
      "../src/routes/$ownerName/$projectName/pullRequest/-pull-request-detail.stylex.ts",
      import.meta.url,
    ),
    "utf8",
  );
  const legacy = await readFile(
    new URL("../../yona-original/app/views/git/partial_state.scala.html", import.meta.url),
    "utf8",
  );
  const less = await readFile(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );
  const css = await readFile(new URL("../src/app.css", import.meta.url), "utf8");

  expect(legacy).toContain("howto-resolve-conflict");
  expect(less).toContain(".howto-resolve-conflict");
  expect(route).toContain('data-stylex-owner="pull-request-detail-conflict-guide"');
  expect(route).toContain("styles.conflictHelp");
  expect(route).toContain("styles.conflictList");
  expect(route).toContain("styles.conflictCode");
  expect(route).toContain("styles.conflictButton");
  expect(styles).toContain('padding: "10px"');
  expect(styles).toContain('marginLeft: "30px"');
  expect(styles).toContain('display: "block"');
  expect(styles).toContain('fontWeight: "normal"');
  expect(css).not.toContain(".pull-request-conflict-guide {");
});
