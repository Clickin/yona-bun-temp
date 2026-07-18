import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const routeSource = new URL("../src/routes/organizations/$organizationName.tsx", import.meta.url);
const styleSource = new URL(
  "../src/routes/organizations/-organization-home.stylex.ts",
  import.meta.url,
);
const legacySource = new URL(
  "../../yona-original/app/views/organization/view.scala.html",
  import.meta.url,
);

test("organization home project filter uses conditional StyleX visibility", async () => {
  const [route, style, legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);
  expect(legacy).toContain("project");
  expect(route).toContain('data-stylex-owner="organization-home-project-filter-item"');
  expect(route).toContain("projectHidden");
  expect(route).not.toContain('style={hidden ? { display: "none" } : undefined}');
  expect(style).toContain('projectHidden: { display: "none" }');
});
