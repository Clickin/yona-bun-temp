import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("project home clone controls own static paint with route-local StyleX", async () => {
  const routeSource = readFileSync(
    new URL("../src/routes/$ownerName/$projectName.tsx", import.meta.url),
    "utf8",
  );
  const styleSource = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/-project-home.stylex.ts", import.meta.url),
    "utf8",
  );
  const legacySource = readFileSync(
    new URL("../../yona-original/app/views/project/home.scala.html", import.meta.url),
    "utf8",
  );
  const legacyLess = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );
  const appCss = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");

  for (const token of [
    "project-clone-wrap",
    "project-clone-url",
    "project-clone-button",
    'id="cloneURL"',
  ]) {
    expect(legacySource).toContain(token);
  }
  for (const token of [".project-clone-wrap", ".project-clone-url", ".project-clone-button"]) {
    expect(legacyLess).toContain(token);
  }
  for (const owner of [
    "project-home-clone-wrap",
    "project-home-clone-url",
    "project-home-clone-button",
  ]) {
    expect(routeSource).toContain(`data-stylex-owner="${owner}"`);
  }
  for (const declaration of [
    'cloneWrap: { borderRadius: "6px", padding: "5px 0", position: "relative" }',
    'width: "100px"',
    'maxWidth: "125px"',
    'right: "86px"',
    "cloneButton: {",
    'width: "86px"',
  ]) {
    expect(styleSource).toContain(declaration);
  }
  expect(appCss).not.toContain(".project-home-header .project-clone-wrap {");
  expect(appCss).not.toContain(".project-home-header .project-clone-button {");
  expect(appCss).toContain(".project-home-header .project-clone-wrap:hover .project-clone-url");
  expect(appCss).toContain(".project-home-header .project-clone-wrap .project-clone-url:focus");
});
