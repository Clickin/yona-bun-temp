import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("milestone mass-update item buttons own milestone geometry and states", async () => {
  const route = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/milestone/$milestoneId.tsx", import.meta.url),
    "utf8",
  );
  const style = readFileSync(
    new URL(
      "../src/routes/$ownerName/$projectName/milestone/-milestone-detail.stylex.ts",
      import.meta.url,
    ),
    "utf8",
  );
  const legacy = readFileSync(
    new URL("../../yona-original/app/views/issue/partial_massupdate.scala.html", import.meta.url),
    "utf8",
  );
  const less = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );
  const css = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");
  // Legacy Scala HTML/JS is output DOM/UX evidence; internal behavior stays React state/events/components + TanStack Router/Query.
  expect(legacy).toContain('class="dropdown-menu mass-update-list"');
  expect(less).toContain(".mass-update-list");
  expect(less).toContain("max-height: 350px");
  expect((route.match(/data-stylex-owner="milestone-detail-mass-update-item"/g) ?? []).length).toBe(
    2,
  );
  expect(route).toContain("styles.massUpdateButton");
  expect(style).toContain('display: "block"');
  expect(style).toContain('padding: "3px 20px"');
  expect(style).toContain('backgroundImage: "linear-gradient(to bottom, #08c, #0077b3)"');
  expect(css).not.toContain(".milestone-detail .mass-update-list > li > button");
  expect(css).not.toContain(".milestone-detail .mass-update-list > li > button:hover");
  expect(css).toContain(".milesion-wrap .mass-update-list > li > button");
  expect(css).toContain(".milesion-wrap .mass-update-list > li > button:hover");
});
