import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const routeSource = new URL("../src/routes/$ownerName/$projectName.tsx", import.meta.url);
const styleSource = new URL(
  "../src/routes/$ownerName/$projectName/-project-home.stylex.ts",
  import.meta.url,
);
const legacySource = new URL(
  "../../yona-original/app/views/milestone/partial_status.scala.html",
  import.meta.url,
);
const legacyStyles = new URL(
  "../../yona-original/app/assets/stylesheets/less/_page.less",
  import.meta.url,
);

test("project home milestone progress owns static geometry with StyleX", async () => {
  const [route, style, legacy, less] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacySource, "utf8"),
    readFile(legacyStyles, "utf8"),
  ]);

  expect(legacy).toContain('<div class="progress-wrap">');
  expect(legacy).toContain('<div class="progress progress-success nm">');
  expect(legacy).toContain('<div class="bar" style="width: @milestone.getCompletionRate%;"></div>');
  expect(less).toContain(".progress-wrap {\n        overflow: hidden;");
  expect(less).toContain("height:7px;");

  expect(style).toContain("milestoneProgressWrap");
  expect(style).toContain('milestoneProgress: { height: "7px", width: "100%" }');
  expect(style).toContain('milestoneProgressBar: (width: string) => ({ height: "100%", width })');
  expect(route).toContain('data-stylex-owner="project-home-milestone-progress-wrap"');
  expect(route).toContain('data-stylex-owner="project-home-milestone-progress"');
  expect(route).toContain('data-stylex-owner="project-home-milestone-progress-bar"');
  expect(route).toContain("projectHomeStyles.milestoneProgressBar(`${completionPercent}%`)");
});
