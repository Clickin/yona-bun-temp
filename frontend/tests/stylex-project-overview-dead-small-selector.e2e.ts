import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("project overview has no active small selector consumer", async () => {
  const routeSource = await readFile(
    new URL("../src/routes/$ownerName/$projectName.tsx", import.meta.url),
    "utf8",
  );
  const appCss = await readFile(new URL("../src/app.css", import.meta.url), "utf8");
  const legacy = await readFile(
    new URL("../../yona-original/app/views/project/partial_dashboard.scala.html", import.meta.url),
    "utf8",
  );
  const legacyLess = await readFile(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );

  expect(legacy).toContain('class="project-overview-home row-fluid"');
  expect(legacyLess).toContain(".project-overview-home");
  expect(routeSource).toContain('className="project-overview-home row-fluid"');
  expect(routeSource).not.toMatch(/project-overview-home[\s\S]{0,500}<small/u);
  expect(routeSource).toContain("stylex.props(projectHomeStyles.empty).className} empty");
  expect(routeSource).toContain("stylex.props(projectHomeStyles.emptyMessage).className");
  expect(appCss).not.toContain(".project-overview-home small");
});
