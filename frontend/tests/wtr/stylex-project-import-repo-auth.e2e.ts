import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("project import owns the conditional repository-auth display in StyleX", () => {
  const route = readFileSync("src/routes/[_]import.tsx", "utf8");
  const stylex = readFileSync("src/routes/-project-import.stylex.ts", "utf8");
  const template = readFileSync("../yona-original/app/views/project/importing.scala.html", "utf8");

  expect(template).toContain('id="repoAuth" class="repo-auth-wrap"');
  expect(template).toContain('style="display:block;"');
  expect(route).toContain('data-stylex-owner="project-import-repo-auth"');
  expect(route).toContain("styles.repoAuthVisible");
  expect(route).not.toContain('style={usesRepoAuth ? { display: "block" } : undefined}');
  expect(stylex).toContain('repoAuthVisible: { display: "block" }');
});

test("project import owns Select2 geometry in route-local StyleX", () => {
  const route = readFileSync("src/routes/[_]import.tsx", "utf8");
  const stylex = readFileSync("src/routes/-project-import.stylex.ts", "utf8");
  const template = readFileSync("../yona-original/app/views/project/importing.scala.html", "utf8");
  expect(template).toContain('data-toggle="select2"');
  expect(route).toContain('data-stylex-owner="project-import-owner-select"');
  expect(route).toContain('data-stylex-owner="project-import-vcs-select"');
  expect(route).not.toContain("style={{ width: 220 }}");
  expect(route).not.toContain(
    'style={ownerMenuOpen ? { display: "block", width: 220 } : undefined}',
  );
  expect(stylex).toContain('selectContainer: { width: "220px" }');
  expect(stylex).toContain('selectDropOpen: { display: "block", width: "220px" }');
});
