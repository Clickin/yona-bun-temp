import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("project home member header uses route-local StyleX", async () => {
  const route = readFileSync(
    new URL("../src/routes/$ownerName/$projectName.tsx", import.meta.url),
    "utf8",
  );
  const style = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/-project-home.stylex.ts", import.meta.url),
    "utf8",
  );
  const legacy = readFileSync(
    new URL("../../yona-original/app/views/project/home.scala.html", import.meta.url),
    "utf8",
  );
  const less = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );
  const css = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");
  expect(legacy).toContain('class="inner member-info"');
  expect(legacy).toContain("project.members");
  expect(less).toContain(".project-home");
  expect(less).toContain("background-color: #F8F8F8");
  expect(route).toContain('data-stylex-owner="project-home-member-header"');
  expect(route).toContain('data-stylex-owner="project-home-member-header-heading"');
  expect(style).toContain('memberHeader: { backgroundColor: "#f8f8f8", padding: "10px 0" }');
  expect(style).toContain('fontSize: "12px"');
  expect(style).toContain('lineHeight: "20px"');
  expect(css).not.toContain(".project-home .inner header {");
  expect(css).not.toContain(".project-home .inner header h3 {");
});
