import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("project home header overview uses route-local Style", async () => {
  const route = readFileSync(
    new URL("../src/routes/$ownerName/$projectName.tsx", import.meta.url),
    "utf8",
  );
  const style = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");
  const legacy = readFileSync(
    new URL("../../yona-original/app/views/project/home.scala.html", import.meta.url),
    "utf8",
  );
  const less = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );
  const css = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");
  for (const token of [
    "project-home-header",
    "project-overview",
    "project-description-edit",
    "project-description-input",
  ])
    expect(legacy).toContain(token);
  for (const token of [
    ".project-home-header",
    ".project-overview",
    ".project-description-edit",
    ".markdown-wrap",
  ])
    expect(less).toContain(token);
  for (const owner of [
    "project-home-header",
    "project-home-overview",
    "project-home-overview-heading",
    "project-home-description-edit-input",
  ])
    expect(route).toContain(`data-owner="${owner}"`);
  expect(css).not.toContain(".project-home-header {");
  expect(css).not.toContain(".project-home-header .project-overview {");
  expect(css).not.toContain(".project-home-header .project-description-edit input {");
});
