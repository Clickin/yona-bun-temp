import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("organization pull-request header owns the server logo background through Dynamic StyleX", () => {
  const route = readFileSync("src/routes/organizations/$organizationName/pullrequests.tsx", "utf8");
  const stylex = readFileSync(
    "src/routes/organizations/$organizationName/-organization-pullrequests.stylex.ts",
    "utf8",
  );
  const template = readFileSync(
    "../yona-original/app/views/organization/header.scala.html",
    "utf8",
  );
  const listTemplate = readFileSync(
    "../yona-original/app/views/organization/group_pullrequest_list.scala.html",
    "utf8",
  );

  expect(template).toContain('class="project-header-outer" style="background-image:url');
  expect(listTemplate).toContain("@header(organization)");
  expect(route).toContain('data-stylex-owner="organization-pullrequests-header-logo"');
  expect(route).toContain("sx.headerLogo(`url('\${logoUrl}')`)");
  expect(route).not.toContain("style={{ backgroundImage:");
  expect(stylex).toContain("headerLogo: (backgroundImage: string) => ({ backgroundImage })");
});
