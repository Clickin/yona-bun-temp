import { readFileSync, expect, test, curatedAppCss } from "../wtr-compat.ts";
test("project and organization member role menus own base button paint", async () => {
  const project = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/members.tsx", import.meta.url),
    "utf8",
  );
  const organization = readFileSync(
    new URL("../src/routes/organizations/$organizationName/members.tsx", import.meta.url),
    "utf8",
  );
  const less = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );
  const projectLegacy = readFileSync(
    new URL("../../yona-original/app/views/project/members.scala.html", import.meta.url),
    "utf8",
  );
  const organizationLegacy = readFileSync(
    new URL("../../yona-original/app/views/organization/members.scala.html", import.meta.url),
    "utf8",
  );
  const css = curatedAppCss();
  for (const source of [projectLegacy, organizationLegacy])
    expect(source).toContain('class="dropdown-menu"');
  expect(less).toContain(".member-setting");
  expect(project).toContain("role-menu-item");
  expect(organization).toContain("role-menu-item");
  expect(css).not.toContain(
    ".members.project .member .member-setting .dropdown-menu > li > button {",
  );
  expect(css).not.toContain(
    ".members.project .member .member-setting .dropdown-menu > li > button:hover",
  );
});
