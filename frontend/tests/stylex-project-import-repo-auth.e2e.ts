import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

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
