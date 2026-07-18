import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("site mass-mail selected projects own active container controls in StyleX", () => {
  const route = readFileSync("src/routes/sites/massmail.tsx", "utf8");
  const legacy = readFileSync("../yona-original/app/views/site/massMail.scala.html", "utf8");
  const less = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const css = readFileSync("src/app.css", "utf8");

  // Legacy Scala HTML/LESS is output DOM/UX evidence; behavior remains React-owned.
  expect(legacy).toContain('id="project-list-wrap"');
  expect(legacy).toContain('id="selected-projects"');
  expect(less).toContain(".mess-mail-wrap");
  expect(route).toContain('data-stylex-owner="site-massmail-selected-projects"');
  expect(route).toContain('data-stylex-owner="site-massmail-selected-project-remove"');
  expect(route).toContain("styles.projectWrapperPanel");
  expect(route).toContain("styles.selectedProjects");
  expect(route).toContain("styles.selectedProjectRemove");
  expect(route).toContain(
    'className={`selected-project-remove ${stylex.props(styles.selectedProjectRemove).className ?? ""}`.trim()}',
  );
  expect(css).not.toContain(".site-admin-page #project-list-wrap {");
  expect(css).not.toContain(".site-admin-page #selected-projects {");
  expect(css).not.toContain(".site-admin-page .selected-project-remove {");
  expect(css).toContain(".site-admin-page .project-select-row {");
});
