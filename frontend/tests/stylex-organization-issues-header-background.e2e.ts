import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const routeSource = new URL(
  "../src/routes/organizations/$organizationName/issues.tsx",
  import.meta.url,
);
const legacySource = new URL(
  "../../yona-original/app/views/organization/header.scala.html",
  import.meta.url,
);

test("organization issues header background uses Dynamic StyleX", async () => {
  const [route, legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);
  expect(legacy).toContain("project-header-outer");
  expect(legacy).toContain("urlToOrganizationLogo(org)");
  expect(route).toContain('data-stylex-owner="organization-issues-header-background"');
  expect(route).toContain("organizationHeaderStyles.background");
  expect(route).not.toContain("style={{ backgroundImage: `url('${logoUrl}')` }}");
});
