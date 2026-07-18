import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("project milestones progress owns static geometry", async () => {
  const source = await readFile(
    new URL("../src/routes/$ownerName/$projectName/milestones.tsx", import.meta.url),
    "utf8",
  );
  const styles = await readFile(
    new URL("../src/routes/$ownerName/$projectName/-milestones.stylex.ts", import.meta.url),
    "utf8",
  );
  const appCss = await readFile(new URL("../src/app.css", import.meta.url), "utf8");
  const legacy = await readFile(
    new URL("../../yona-original/app/views/milestone/list.scala.html", import.meta.url),
    "utf8",
  );
  const less = await readFile(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );
  expect(legacy).toContain('class="progress-wrap"');
  expect(less).toContain(".milestones");
  expect(source).toContain('data-stylex-owner="project-milestones-progress-wrap"');
  expect(source).toContain('data-stylex-owner="project-milestones-progress"');
  expect(styles).toContain('width: "100%"');
  expect(appCss).not.toContain(".milestones .progress-wrap {");
  expect(appCss).not.toContain(".milestones .progress {");
  expect(appCss).toContain(".milestones .bar {");
});
