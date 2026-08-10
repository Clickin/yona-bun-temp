import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("project form conditional displays use route-local Style ownership", async () => {
  const [legacy, route, style] = await Promise.all([
    readFile("../yona-original/app/views/project/create.scala.html", "utf8"),
    readFile("src/routes/projectform.tsx", "utf8"),
    readFile("src/app.css", "utf8"),
  ]);
  expect(legacy).toContain('id="opt-protected"');
  expect(legacy).toContain('style="display:none;"');
  expect(legacy).toContain('id="svn"');
  expect(legacy).toContain('style="display: none;"');
  expect(route).toContain('data-owner="project-form-protected-scope"');
  expect(route).toContain('data-owner="project-form-vcs-warning"');
  expect(route).toContain("data-owner={`project-form-menu-${name}`}");

  expect(route).not.toMatch(/style=\{[^}]*display/gu);
});
