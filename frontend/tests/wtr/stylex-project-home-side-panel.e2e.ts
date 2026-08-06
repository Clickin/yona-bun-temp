import { expect, test } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";

test("project home side panel owns legacy padding", async () => {
  const source = readFileSync("src/routes/$ownerName/$projectName.tsx", "utf8");
  const styles = readFileSync("src/routes/$ownerName/$projectName/-project-home.stylex.ts", "utf8");
  const legacy = readFileSync("../yona-original/app/views/project/home.scala.html", "utf8");
  const less = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const css = readFileSync("src/app.css", "utf8");
  expect(legacy).toContain('class="bubble-wrap gray project-home"');
  expect(less).toContain(".project-home");
  expect(source).toContain('data-stylex-owner="project-home-side-panel"');
  expect(source).not.toContain("project-status");
  expect(styles).toContain("projectHome:");
  expect(less).toContain(".project-status");
  expect(css).not.toContain(".project-home {\n  padding: 10px;");
  expect(css).not.toContain(".project-home .issue-wrap {");
  expect(css).not.toContain(".project-home .issue-wrap a.btn {");
  expect(css).not.toContain(".project-home .inner header .project-status");
  expect(css).not.toContain(".project-status .ico-like");
  expect(css).not.toContain(".project-status .num");
  expect(css).not.toContain(".project-status .sp");
});
