import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = "src/routes/$ownerName/$projectName.tsx";
const styleSource = "src/routes/$ownerName/$projectName/-project-home.stylex.ts";
const legacySource =
  "../yona-original/app/views/project/partial_dashboard_issuesbylabel.scala.html";

test("project overview labels use route StyleX geometry owners", async () => {
  const [route, style, legacy] = [
    readFileSync(routeSource, "utf8"),
    readFileSync(styleSource, "utf8"),
    readFileSync(legacySource, "utf8"),
  ];
  expect(legacy).toContain("overview-label");
  expect(route).toContain('data-stylex-owner="project-home-overview-label"');
  expect(style).toContain("overviewLabelDt");
  expect(style).toContain("overviewLabelDd");
  expect(style).toContain("overviewLabelFirst");
  expect(style).toContain("overviewLabelLast");
  expect(style).toContain('borderBottom: "1px solid #eee"');
});
