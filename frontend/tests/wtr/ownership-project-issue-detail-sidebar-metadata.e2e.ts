import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("issue detail sidebar metadata uses route-local Style ownership", async () => {
  const routeSource = readFileSync(
    "../src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );
  const styleSource = readFileSync("../src/app.css", "utf8");
  const legacySource = readFileSync("../yona-original/app/views/issue/view.scala.html", "utf8");
  const legacyLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_page.less",
    "utf8",
  );
  const legacyResponsiveLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const appCss = readFileSync("../src/app.css", "utf8");

  expect(legacySource).toContain('class="issue-info"');
  expect(legacyLess).toContain(".issue-info {");
  expect(legacyLess).toContain("margin-bottom:20px;");
  expect(legacyLess).toContain("padding:5px 0px;");
  expect(legacyResponsiveLess).toContain(".issue-info {");
  expect(legacyResponsiveLess).toContain("padding: 15px 0 0 10px;");

  expect(routeSource.match(/data-owner="issue-detail-sidebar-dl"/g)).toHaveLength(3);
  expect(routeSource.match(/data-owner="issue-detail-sidebar-dd"/g)).toHaveLength(4);
  expect(routeSource).toContain('data-owner="issue-detail-sidebar-assignee-name"');

  expect(appCss).not.toContain(".issue-detail-page .issue-info dl {");
  expect(appCss).not.toContain(".issue-detail-page .issue-info dd {");
  expect(appCss).not.toContain(".issue-detail-page .issue-info .name,");
  expect(appCss).toContain(".issue-detail-page .issue-info p {");
  expect(appCss).toContain(".issue-detail-page .issue-info .status {");
});
