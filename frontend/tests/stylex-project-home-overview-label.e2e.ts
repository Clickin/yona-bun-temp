import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
const routeSource = new URL("../src/routes/$ownerName/$projectName.tsx", import.meta.url);
const styleSource = new URL(
  "../src/routes/$ownerName/$projectName/-project-home.stylex.ts",
  import.meta.url,
);
const legacySource = new URL(
  "../../yona-original/app/views/project/partial_dashboard_issuesbylabel.scala.html",
  import.meta.url,
);
test("project overview labels use route StyleX geometry owners", async () => {
  const [route, style, legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);
  expect(legacy).toContain("overview-label");
  expect(route).toContain('data-stylex-owner="project-home-overview-label"');
  expect(style).toContain("overviewLabelDt");
  expect(style).toContain("overviewLabelDd");
  expect(style).toContain("overviewLabelFirst");
  expect(style).toContain("overviewLabelLast");
  expect(style).toContain('borderBottom: "1px solid #eee"');
});
