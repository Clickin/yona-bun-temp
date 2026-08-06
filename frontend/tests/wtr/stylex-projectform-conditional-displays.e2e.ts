import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("project form conditional displays use route-local StyleX ownership", async () => {
  const [legacy, route, style] = await Promise.all([
    readFile("../yona-original/app/views/project/create.scala.html", "utf8"),
    readFile("src/routes/projectform.tsx", "utf8"),
    readFile("src/routes/-projectform.stylex.ts", "utf8"),
  ]);
  expect(legacy).toContain('id="opt-protected"');
  expect(legacy).toContain('style="display:none;"');
  expect(legacy).toContain('id="svn"');
  expect(legacy).toContain('style="display: none;"');
  expect(route).toContain('data-stylex-owner="project-form-protected-scope"');
  expect(route).toContain('data-stylex-owner="project-form-vcs-warning"');
  expect(route).toContain("data-stylex-owner={`project-form-menu-${name}`}");
  expect(route).toContain("projectFormConditionalStyles.hidden");
  expect(route).not.toMatch(/style=\{[^}]*display/gu);
  expect(style).toContain('hidden: { display: "none" }');
});
