import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("notification badge owns the exact frozen primitive and retires its class", () => {
  const route = readFileSync("src/routes/sites/projectList.tsx", "utf8");

  const layout = readFileSync("../yona-original/app/views/site/siteMngLayout.scala.html", "utf8");
  const common = readFileSync("../yona-original/app/assets/stylesheets/less/_common.less", "utf8");
  const variables = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_variables.less",
    "utf8",
  );
  expect(layout).toContain(
    '@if(YobiUpdate.versionToUpdate != null) { <span class="notification-badge">1</span> }',
  );
  expect(common).toContain(".notification-badge {");
  expect(common).toContain("border:2px solid #FFF;");
  expect(common).toContain("background-color:@yobi-primary;");
  expect(common).toContain(
    "box-shadow: 0 1px 1px rgba(0,0,0,0.2), inset 0 1px 1px rgba(0,0,0,0.1);",
  );
  expect(variables).toContain("@yobi-primary : @yobi-orange;");
  // Icon owner is wired through the shared SiteAdminSidebar's badgeOwner prop
  // (data-owner={badgeOwner}); the route pins the prop, not the attribute.
  expect(route).toContain('badgeOwner="site-project-list-notification-badge"');
  expect(route).not.toContain('className="notification-badge"');
});
