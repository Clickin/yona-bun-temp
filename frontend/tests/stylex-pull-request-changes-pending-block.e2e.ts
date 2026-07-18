import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const routeSource = new URL(
  "../src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes.tsx",
  import.meta.url,
);
const styleSource = new URL(
  "../src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/-pull-request-changes.stylex.ts",
  import.meta.url,
);
const legacySource = new URL(
  "../../yona-original/app/views/git/viewChanges.scala.html",
  import.meta.url,
);

test("pull request changes pending review block uses conditional and Dynamic StyleX", async () => {
  const [route, style, legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);
  expect(legacy).toContain("btnPop");
  expect(route).toContain('data-stylex-owner="pull-request-changes-pending-block"');
  expect(route).toContain("pendingBlock.top");
  expect(route).toContain("pendingBlock.left");
  expect(route).not.toContain(
    'style={{ top: pendingBlock.top, left: pendingBlock.left, display: "block" }}',
  );
  expect(style).toContain('pendingBlockVisible: { display: "block" }');
  expect(style).toContain("pendingBlockPosition: (top: number, left: number)");
});
