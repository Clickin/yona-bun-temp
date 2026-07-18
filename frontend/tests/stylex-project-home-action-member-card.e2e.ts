import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("project home action and member card use route-local StyleX", async () => {
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
    expect(routeSource).toContain(`data-stylex-owner="${owner}"`);
  }
  for (const declaration of [
    'projectButtonWrap: { padding: "5px 0", textAlign: "center" }',
    'projectButtonItem: { display: "block", marginTop: "10px" }',
    'projectButtonLink: { display: "block" }',
    'memberInnerInfo: { height: "auto", marginRight: "0" }',
    'members: { listStyle: "none", margin: "0", padding: "10px" }',
    'maxWidth: "180px"',
    'textOverflow: "ellipsis"',
  ]) {
    expect(styleSource).toContain(declaration);
  }
  expect(appCss).not.toContain(".project-home .project-btn-wrap {");
  expect(appCss).not.toContain(".project-home .inner.member-info {");
  expect(appCss).not.toContain(".project-home .inner .project-members {");
  expect(appCss).not.toContain(".project-home .inner .project-members .member {");
});
