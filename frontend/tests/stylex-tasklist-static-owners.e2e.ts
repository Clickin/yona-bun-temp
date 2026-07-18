import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("issue and post tasklists own the active legacy static geometry", async () => {
  const issueSource = await readFile(
    new URL("../src/routes/$ownerName/$projectName/issue/$issueNumber.tsx", import.meta.url),
    "utf8",
  );
  const postSource = await readFile(
    new URL("../src/routes/$ownerName/$projectName/post/$postNumber.tsx", import.meta.url),
    "utf8",
  );
  const issueStyles = await readFile(
    new URL("../src/routes/$ownerName/$projectName/issue/-issue-detail.stylex.ts", import.meta.url),
    "utf8",
  );
  const postStyles = await readFile(
    new URL("../src/routes/$ownerName/$projectName/post/-post-detail.stylex.ts", import.meta.url),
    "utf8",
  );
  const legacyPartial = await readFile(
    new URL("../../yona-original/app/views/common/tasklistBar.scala.html", import.meta.url),
    "utf8",
  );
  const issueLegacy = await readFile(
    new URL("../../yona-original/app/views/issue/view.scala.html", import.meta.url),
    "utf8",
  );
  const boardLegacy = await readFile(
    new URL("../../yona-original/app/views/board/view.scala.html", import.meta.url),
    "utf8",
  );
  const less = await readFile(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );

  expect(legacyPartial).toContain('<div class="tasklist">');
  expect(issueLegacy).toContain("@common.tasklistBar()");
  expect(boardLegacy).toContain("@common.tasklistBar()");
  expect(less).toContain(".tasklist");
  for (const source of [issueSource, postSource]) {
    expect(source).toContain("tasklist");
    expect(source).toContain("task-title");
    expect(source).toContain("task-progress");
    expect(source).toContain("data-stylex-owner");
  }
  for (const styles of [issueStyles, postStyles]) {
    expect(styles).toContain("tasklist:");
    expect(styles).toContain("taskTitle:");
    expect(styles).toContain("taskDoneCounter:");
    expect(styles).toContain("taskProgress:");
    expect(styles).toContain("taskProgressBar:");
  }
});
