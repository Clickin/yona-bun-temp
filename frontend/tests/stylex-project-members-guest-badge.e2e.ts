import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("project member guest badge uses route-local StyleX", async () => {
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
  const css = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");
  expect(legacy).toContain('<span class="guest">GUEST</span>');
  expect(less).toContain(".members.project");
  expect(less).toContain("background-color: rgba(255, 165, 0, 0.8)");
  expect(route).toContain('data-stylex-owner="project-members-guest-badge"');
  expect(route).toContain("guestBadge:");
  expect(route).toContain('backgroundColor: "rgba(255, 165, 0, 0.8)"');
  expect(css).not.toContain(".members.project .guest {");
});
