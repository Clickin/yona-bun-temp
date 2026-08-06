import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("project issues owns static residual spacing with route-local StyleX", async () => {
  const routeSource = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/issues.tsx", import.meta.url),
    "utf8",
  );
  const styleSource = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/-issues.stylex.ts", import.meta.url),
    "utf8",
  );

  expect(routeSource).toContain('data-stylex-owner="project-issues-excel-download"');
  expect(routeSource).toContain('data-stylex-owner="project-issues-manage-label"');
  expect(routeSource).toContain('data-stylex-owner="project-issues-two-column-anchor"');
  expect(routeSource).toContain('data-stylex-owner="project-issues-subtasks-anchor"');
  expect(routeSource).toContain('data-stylex-owner="project-issues-keymap"');
  expect(routeSource).not.toContain('style={{ padding: "10px" }}');
  expect(routeSource).not.toContain('style={{ padding: "10px 0", marginLeft: "55px" }}');
  expect(routeSource).not.toContain('style={{ position: "relative" }}');
  expect(styleSource).toContain('downloadWrap: { float: "left", padding: "10px" }');
  expect(styleSource).toContain(
    'keymapWrap: { float: "left", marginLeft: "55px", padding: "10px 0" }',
  );
  expect(styleSource).toContain('manageLabel: { marginLeft: "2px" }');
  expect(styleSource).toContain('relativeAnchor: { position: "relative" }');
});
