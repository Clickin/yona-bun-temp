import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("project setting logo and branch result use StyleX owners", async () => {
  const [legacy, route, style] = await Promise.all([
    readFile("../yona-original/app/views/project/setting.scala.html", "utf8"),
    readFile("src/routes/$ownerName/$projectName/setting.tsx", "utf8"),
    readFile("src/routes/$ownerName/$projectName/-setting.stylex.ts", "utf8"),
  ]);
  expect(legacy).toContain("background-image:url('@urlToProjectLogo(project)')");
  expect(route).toContain('data-stylex-owner="project-setting-logo"');
  expect(route).toContain("styles.logoBackground(");
  expect(route).toContain('data-stylex-owner="project-setting-default-branch-result"');
  expect(route).not.toContain("backgroundImage: `url('");
  expect(route).not.toContain('fontFamily: "inherit"');
  expect(style).toContain("logoBackground: (backgroundImage: string)");
  expect(style).toContain("defaultBranchResult");
});
