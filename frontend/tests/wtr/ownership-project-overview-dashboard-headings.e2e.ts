import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("project overview dashboard headings use one Style owner", async () => {
  const route = readFileSync(
    new URL("../src/routes/$ownerName/$projectName.tsx", import.meta.url),
    "utf8",
  );
  const style = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");
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
  expect(route.match(/<h5[\s\S]*?data-owner="project-home-overview-heading"/g)).toHaveLength(4);
  expect(style).toContain("sectionHeading");
  expect(css).not.toContain(".project-overview-home h5 {");
  // bucket-3 pin fix (2026-08-06): src/app.css no longer carries
  // ".project-overview-home .empty {" — the empty-state styles moved into
  // -project-home.style.ts (`empty` / `emptyMessage` owners); see the
  // visible-state sibling spec which already pins the not-contain form.
  expect(css).not.toContain(".project-overview-home .empty {");
});
