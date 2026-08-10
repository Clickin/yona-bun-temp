import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("project setting logo and branch result use Style owners", async () => {
  const [legacy, route] = await Promise.all([
    readFileSync("../yona-original/app/views/project/setting.scala.html", "utf8"),
    readFileSync("src/routes/$ownerName/$projectName/setting.tsx", "utf8"),
  ]);
  expect(legacy).toContain("background-image:url('@urlToProjectLogo(project)')");
  expect(route).toContain('data-owner="project-setting-logo"');

  expect(route).toContain('data-owner="project-setting-default-branch-result"');
  // bucket-3: legacy setting.scala.html keeps the inline dynamic logo URL
  // (`background-image:url('@urlToProjectLogo(project)')`); the port renders
  // `backgroundImage: \`url('${projectLogoUrl(project, runtimeConfig.basePath)}')``
  // inline and passes the same dynamic URL to the Style logoBackground
  // function, so the old "no inline backgroundImage url(" pin is stale.
  expect(route).toContain(
    "backgroundImage: `url('${projectLogoUrl(project, runtimeConfig.basePath)}')`",
  );
});
