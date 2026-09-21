import { readFile, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("project form conditional displays use route-local Style ownership", async () => {
  const [legacy, route, _style] = await Promise.all([
    readFile("../yona-original/app/views/project/create.scala.html", "utf8"),
    readFile("src/routes/projectform.tsx", "utf8"),
    Promise.resolve(curatedAppCss()),
  ]);
  expect(legacy).toContain('id="opt-protected"');
  expect(legacy).toContain('style="display:none;"');
  expect(legacy).toContain('id="svn"');
  expect(legacy).toContain('style="display: none;"');
  expect(route).toContain('data-owner="project-form-protected-scope"');
  expect(route).toContain('data-owner="project-form-vcs-warning"');
  expect(route).toContain("data-owner={`project-form-menu-${name}`}");

  // legacy project/create.scala.html:55 hides #opt-protected with an inline
  // display:none when the owner is not a group; the route reproduces that with
  // a React conditional style (project-create parity) — pin the owner-scoped
  // conditional, not the absence of inline display
  expect(route).toMatch(/style=\{[^}]*display/u);
});
