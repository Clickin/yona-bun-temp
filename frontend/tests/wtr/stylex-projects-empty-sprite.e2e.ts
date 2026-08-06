import { expect, test } from "../wtr-compat.ts";
import { readFile } from "../wtr-compat.ts";

test("projects empty-state sprite uses route-local StyleX", async () => {
  const [legacy, route] = await Promise.all([
    readFile("../yona-original/app/views/project/list.scala.html", "utf8"),
    readFile("src/routes/projects.tsx", "utf8"),
  ]);
  expect(legacy).toContain('Messages("project.is.empty")');
  expect(route).toContain('data-stylex-owner="projects-directory-empty-icon"');
  expect(route).toContain("projectsDirectoryDynamicStyles.emptyIconSprite");
  expect(route).not.toContain("style={emptyStateSpriteStyle}");
  expect(route).toContain("emptyIconSprite: (backgroundImage: string) => ({ backgroundImage })");
});
