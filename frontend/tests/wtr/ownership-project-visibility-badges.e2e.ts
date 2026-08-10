import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("project and organization visibility badges own legacy geometry", async () => {
  const projectSource = await readFile(
    new URL("../src/routes/$ownerName/$projectName.tsx", import.meta.url),
    "utf8",
  );
  const organizationSource = await readFile(
    new URL("../src/routes/organizations/$organizationName.tsx", import.meta.url),
    "utf8",
  );
  const projectLegacy = await readFile(
    new URL("../../yona-original/app/views/project/header.scala.html", import.meta.url),
    "utf8",
  );
  const homeLegacy = await readFile(
    new URL("../../yona-original/app/views/project/home.scala.html", import.meta.url),
    "utf8",
  );
  const organizationLegacy = await readFile(
    new URL("../../yona-original/app/views/organization/view.scala.html", import.meta.url),
    "utf8",
  );
  const less = await readFile(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );

  expect(projectLegacy).toContain("project-protected");
  expect(organizationLegacy).toContain("project-protected");
  expect(projectLegacy).toContain("project-private");
  expect(homeLegacy).toContain("project-private");
  expect(less).toContain(".project-protected");
  expect(less).toContain(".project-private");
  for (const source of [projectSource, organizationSource]) {
    expect(source).toContain("data-owner");
  }
});
