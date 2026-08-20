import { readFileSync, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("project home action and member card use route-local Style", async () => {
  const routeSource = readFileSync(
    new URL("../src/routes/$ownerName/$projectName.tsx", import.meta.url),
    "utf8",
  );
  const styleSource = curatedAppCss();
  const legacySource = readFileSync(
    new URL("../../yona-original/app/views/project/home.scala.html", import.meta.url),
    "utf8",
  );
  const legacyLess = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );
  const appCss = curatedAppCss();

  for (const token of [
    "project-btn-wrap",
    "project-btn-item",
    "member-info",
    "project-members",
    'class="member"',
  ]) {
    expect(legacySource).toContain(token);
  }
  for (const token of [".project-btn-wrap", ".project-members", ".member-info", ".member {"]) {
    expect(legacyLess).toContain(token);
  }
  for (const owner of [
    "project-home-project-button-wrap",
    "project-home-project-button-item",
    "project-home-member-inner",
    "project-home-members",
    "project-home-member",
    "project-home-member-name",
  ]) {
    expect(routeSource).toContain(`data-owner="${owner}"`);
  }
  for (const declaration of []) {
    expect(styleSource).toContain(declaration);
  }
  expect(appCss).not.toContain(".project-home .project-btn-wrap {");
  expect(appCss).not.toContain(".project-home .inner.member-info {");
  expect(appCss).not.toContain(".project-home .inner .project-members {");
  expect(appCss).not.toContain(".project-home .inner .project-members .member {");
});
