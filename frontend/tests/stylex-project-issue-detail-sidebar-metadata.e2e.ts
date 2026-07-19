import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("issue detail sidebar metadata uses route-local StyleX ownership", async () => {
  const routeSource = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/issue/$issueNumber.tsx", import.meta.url),
    "utf8",
  );
  const styleSource = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/issue/-issue-detail.stylex.ts", import.meta.url),
    "utf8",
  );
  const legacySource = readFileSync(
    new URL("../../yona-original/app/views/issue/view.scala.html", import.meta.url),
    "utf8",
  );
  const legacyLess = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );
  const appCss = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");

  expect(legacySource).toContain('class="issue-info"');
  expect(legacyLess).toContain(".issue-info {");
  expect(legacyLess).toContain("margin-bottom:20px;");
  expect(legacyLess).toContain("padding:5px 0px;");

  expect(routeSource.match(/data-stylex-owner="issue-detail-sidebar-dl"/g)).toHaveLength(3);
  expect(routeSource.match(/data-stylex-owner="issue-detail-sidebar-dd"/g)).toHaveLength(4);
  expect(routeSource).toContain('data-stylex-owner="issue-detail-sidebar-assignee-name"');
  expect(styleSource).toContain("issueInfo: {");
  expect(styleSource).toContain('padding: "15px 0 0 52px"');
  expect(styleSource).toContain('padding: "15px 0 0 10px"');
  expect(styleSource).toContain('sidebarMetaDl: { marginBottom: "20px" }');
  expect(styleSource).toContain('sidebarMetaDd: { padding: "5px 0px" }');
  expect(styleSource).toContain('sidebarMetaAssigneeName: { fontSize: "11px" }');

  expect(appCss).not.toContain(".issue-detail-page .issue-info dl {");
  expect(appCss).not.toContain(".issue-detail-page .issue-info dd {");
  expect(appCss).not.toContain(".issue-detail-page .issue-info .name,");
  expect(appCss).toContain(".issue-detail-page .issue-info p {");
  expect(appCss).toContain(".issue-detail-page .issue-info .status {");
});
