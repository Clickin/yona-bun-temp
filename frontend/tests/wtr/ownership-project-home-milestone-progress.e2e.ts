import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = new URL("../src/routes/$ownerName/$projectName.tsx", import.meta.url);
const styleSource = "../src/app.css";
const legacySource = new URL(
  "../../yona-original/app/views/milestone/partial_status.scala.html",
  import.meta.url,
);
const legacyStyles = new URL(
  "../../yona-original/app/assets/stylesheets/less/_page.less",
  import.meta.url,
);

test("project home milestone progress owns static geometry with Style", async () => {
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

  expect(route).toContain('data-owner="project-home-milestone-progress-wrap"');
  expect(route).toContain('data-owner="project-home-milestone-progress"');
  expect(route).toContain('data-owner="project-home-milestone-progress-bar"');
});
