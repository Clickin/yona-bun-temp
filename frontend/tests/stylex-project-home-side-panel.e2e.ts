import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("project home side panel owns legacy padding", async () => {
  const source = await readFile(
    new URL("../src/routes/$ownerName/$projectName.tsx", import.meta.url),
    "utf8",
  );
  const styles = await readFile(
    new URL("../src/routes/$ownerName/$projectName/-project-home.stylex.ts", import.meta.url),
    "utf8",
  );
  const legacy = await readFile(
    new URL("../../yona-original/app/views/project/home.scala.html", import.meta.url),
    "utf8",
  );
  const less = await readFile(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );
  const css = await readFile(new URL("../src/app.css", import.meta.url), "utf8");
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
