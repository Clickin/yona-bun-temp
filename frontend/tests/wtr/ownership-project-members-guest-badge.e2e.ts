import { readFileSync, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("project member guest badge uses route-local Style", async () => {
  const route = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/members.tsx", import.meta.url),
    "utf8",
  );
  const legacy = readFileSync(
    new URL("../../yona-original/app/views/project/members.scala.html", import.meta.url),
    "utf8",
  );
  const less = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );
  const css = curatedAppCss();
  expect(legacy).toContain('<span class="guest">GUEST</span>');
  expect(less).toContain(".members.project");
  expect(less).toContain("background-color: rgba(255, 165, 0, 0.8)");
  expect(route).toContain('data-owner="project-members-guest-badge"');

  expect(css).not.toContain(".members.project .guest {");
});
