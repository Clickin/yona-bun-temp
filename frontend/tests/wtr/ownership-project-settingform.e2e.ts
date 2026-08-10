import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/settingform.tsx", import.meta.url),
  "utf8",
);
const styleSource =
  readFileSync(new URL("../src/app.css", import.meta.url), "utf8") +
  readFileSync(
    new URL("../frontend/public/legacy-assets/stylesheets/legacy-fallback.css", import.meta.url),
    "utf8",
  );

test("setting form declares route-local Style owners and paint vars", () => {
  // bucket-3: the route's owner names track the legacy shells they port
  // (page-wrap-outer / project-page-wrap from setting.scala.html); the older
  // `project-settingform-page` / `project-settingform-shell` names are stale.
  expect(routeSource).toContain('data-owner="project-settingform-page-wrap-outer"');
  expect(routeSource).toContain('data-owner="project-settingform-project-page-wrap"');

  expect(routeSource).not.toContain("document.querySelector");
  expect(routeSource).not.toContain("dangerouslySetInnerHTML");
});

test("setting form keeps the legacy route screen boundary", () => {
  expect(routeSource).toContain("ProjectSettingRouteScreen");
  expect(routeSource).toContain('selfRoutePath="/$ownerName/$projectName/settingform"');
});
