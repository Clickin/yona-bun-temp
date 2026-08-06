import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("project overview visible empty and label states use StyleX", async () => {
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
  for (const owner of [
    "project-home-overview-empty",
    "project-home-overview-empty-message",
    "project-home-overview-label",
    "project-home-overview-label-term",
    "project-home-overview-label-definition",
    "overviewLabelDt",
    "overviewLabelDd",
  ])
    expect(route + style).toContain(owner);
  for (const selector of [
    ".project-overview-home .empty {",
    ".project-overview-home .empty p {",
    ".project-overview-home .overview-label {",
    ".project-overview-home .overview-label dt {",
    ".project-overview-home .overview-label dd {",
    ".project-overview-home .overview-label:first-of-type {",
    ".project-overview-home .overview-label:last-of-type {",
  ])
    expect(css).not.toContain(selector);
  // bucket-3 pin fix (2026-08-06): src/app.css no longer carries
  // ".search-category-wrap li.empty" — the empty search-category color moved
  // into -project-search.stylex.ts (`searchCategoryEmpty`); the DOM keeps the
  // literal `empty` class (count === 0) for legacy hooks.
  expect(css).not.toContain(".search-category-wrap li.empty");
});
