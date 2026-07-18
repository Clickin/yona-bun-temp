import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("project overview dashboard headings use one StyleX owner", async () => {
  const route = readFileSync(
    new URL("../src/routes/$ownerName/$projectName.tsx", import.meta.url),
    "utf8",
  );
  const style = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/-project-home.stylex.ts", import.meta.url),
    "utf8",
  );
  const legacy = readFileSync(
    new URL("../../yona-original/app/views/project/partial_dashboard.scala.html", import.meta.url),
    "utf8",
  );
  const less = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );
  const css = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");
  expect(legacy).toContain("project-overview-home");
  expect(less).toContain(".project-overview-home");
  expect(route.match(/<h5[\s\S]*?data-stylex-owner="project-home-overview-heading"/g)).toHaveLength(
    4,
  );
  expect(style).toContain("sectionHeading");
  expect(css).not.toContain(".project-overview-home h5 {");
  expect(css).toContain(".project-overview-home .empty {");
});
