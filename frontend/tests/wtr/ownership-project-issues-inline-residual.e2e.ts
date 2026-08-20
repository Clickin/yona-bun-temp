import { readFileSync, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("project issues owns static residual spacing with route-local Style", async () => {
  const routeSource = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/issues.tsx", import.meta.url),
    "utf8",
  );
  const styleSource = curatedAppCss();

  expect(routeSource).toContain('data-owner="project-issues-excel-download"');
  expect(routeSource).toContain('data-owner="project-issues-manage-label"');
  expect(routeSource).toContain('anchorOwner="project-issues-two-column-anchor"');
  expect(routeSource).toContain('anchorOwner="project-issues-subtasks-anchor"');
  expect(routeSource).toContain('data-owner="project-issues-keymap"');
});
