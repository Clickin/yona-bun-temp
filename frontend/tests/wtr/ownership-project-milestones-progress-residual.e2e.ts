import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("project milestones progress owns static geometry", async () => {
  const source = await readFile(
    new URL("../src/routes/$ownerName/$projectName/milestones.tsx", import.meta.url),
    "utf8",
  );
  const styles = await readFile(new URL("../src/app.css", import.meta.url), "utf8");
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
  expect(source).toContain('data-owner="project-milestones-progress-wrap"');
  expect(source).toContain('data-owner="project-milestones-progress"');
  expect(source).toContain('data-owner="project-milestones-infos"');
  expect(source).toContain('data-owner="project-milestones-completion"');
  expect(source).toContain("project-milestones-progress-bar");

  expect(appCss).not.toContain(".milestones .progress-wrap {");
  expect(appCss).not.toContain(".milestones .progress {");
  expect(appCss).not.toContain(".milestones .bar {");
  expect(appCss).not.toContain(".milestones .infos {");
  expect(appCss).not.toContain(".milestones .milestone:last-of-type {");
  expect(appCss).not.toContain(".milestones .desc {");
});
