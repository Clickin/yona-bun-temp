import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("project import owns the conditional repository-auth display in Style", () => {
  const route = readFileSync("src/routes/[_]import.tsx", "utf8");

  const template = readFileSync("../yona-original/app/views/project/importing.scala.html", "utf8");

  expect(template).toContain('id="repoAuth" class="repo-auth-wrap"');
  expect(template).toContain('style="display:block;"');
  expect(route).toContain('data-owner="project-import-repo-auth"');
});

test("project import owns Select2 geometry in route-local Style", () => {
  const route = readFileSync("src/routes/[_]import.tsx", "utf8");

  const template = readFileSync("../yona-original/app/views/project/importing.scala.html", "utf8");
  expect(template).toContain('data-toggle="select2"');
  expect(route).toContain('data-owner="project-import-owner-select"');
  expect(route).toContain('data-owner="project-import-vcs-select"');
});
