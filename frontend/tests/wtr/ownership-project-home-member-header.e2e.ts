import { readFileSync, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("project home member header uses route-local Style", async () => {
  const route = readFileSync(
    new URL("../src/routes/$ownerName/$projectName.tsx", import.meta.url),
    "utf8",
  );
  const style = curatedAppCss();
  const legacy = readFileSync(
    new URL("../../yona-original/app/views/project/home.scala.html", import.meta.url),
    "utf8",
  );
  const less = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );
  const css = curatedAppCss();
  expect(legacy).toContain('class="inner member-info"');
  expect(legacy).toContain("project.members");
  expect(less).toContain(".project-home");
  expect(less).toContain("background-color: #F8F8F8");
  expect(route).toContain('data-owner="project-home-member-header"');
  expect(route).toContain('data-owner="project-home-member-header-heading"');

  expect(css).not.toContain(".project-home .inner header {");
  expect(css).not.toContain(".project-home .inner header h3 {");
});
