import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("projects empty-state sprite uses route-local StyleX", async () => {
  const [legacy, route] = await Promise.all([
    readFile("../yona-original/app/views/project/list.scala.html", "utf8"),
    readFile("src/routes/projects.tsx", "utf8"),
  ]);
  expect(legacy).toContain('Messages("project.is.empty")');
  expect(route).toContain('data-stylex-owner="projects-directory-empty-icon"');
  expect(route).toContain("projectsDirectoryDynamicStyles.emptyIconSprite");
  expect(route).not.toContain("style={emptyStateSpriteStyle}");
  expect(route).toContain("backgroundImage: `url(${legacySpriteUrl})`");
});
