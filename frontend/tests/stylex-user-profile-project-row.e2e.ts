import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("public profile project row owns its active legacy geometry", async () => {
  const source = await readFile(new URL("../src/routes/$user.tsx", import.meta.url), "utf8");
  const styleSource = await readFile(
    new URL("../src/routes/-user-profile.stylex.ts", import.meta.url),
    "utf8",
  );
  const legacy = await readFile(
    new URL("../../yona-original/app/views/user/partial_projectlist.scala.html", import.meta.url),
    "utf8",
  );
  const less = await readFile(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );

  expect(legacy).toContain('<li class="project">');
  expect(legacy).toContain('<div class="stats-wrap pull-right">');
  expect(less).toContain(".all-projects");
  expect(less).toContain("border-bottom: 1px solid #DCDCDC");
  expect(source).toContain('data-stylex-owner="user-profile-project-row"');
  expect(source).toContain('data-stylex-owner="user-profile-project-header"');
  expect(source).toContain('data-stylex-owner="user-profile-project-description"');
  expect(source).toContain('data-stylex-owner="user-profile-project-name-tag"');
  expect(source).toContain('data-stylex-owner="user-profile-project-stats"');
  expect(styleSource).toContain("projectRow:");
  expect(styleSource).toContain("projectHeader:");
  expect(styleSource).toContain("projectDescription:");
  expect(styleSource).toContain("projectNameTag:");
  expect(styleSource).toContain("projectStats:");
});
