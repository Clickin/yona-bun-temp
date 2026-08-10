import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// wave-9 boards precedent: URL fixtures must arrive as string paths so the
// .ts/.tsx .txt-suffix mapping serves them RAW (URL objects bypass the suffix
// and get esbuild-transformed, which drops trailing commas in source pins).
const fileURLToPath = (u: URL) => u.pathname;

const routeSource = new URL(
  "../src/routes/organizations/$organizationName/issues.tsx",
  import.meta.url,
);
const legacySource = new URL(
  "../../yona-original/app/views/organization/header.scala.html",
  import.meta.url,
);

test("organization issues header background uses Dynamic Style", async () => {
  const [route, legacy] = await Promise.all([
    readFile(fileURLToPath(routeSource), "utf8"),
    readFile(fileURLToPath(legacySource), "utf8"),
  ]);
  expect(legacy).toContain("project-header-outer");
  expect(legacy).toContain("urlToOrganizationLogo(org)");
  expect(route).toContain('data-owner="organization-issues-header-background"');
});
