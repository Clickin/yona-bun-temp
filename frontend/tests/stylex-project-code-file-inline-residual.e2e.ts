import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const routeSource = readFileSync(
  fileURLToPath(
    new URL("../src/routes/$ownerName/$projectName/code/$branch/$filePath.tsx", import.meta.url),
  ),
  "utf8",
);
const styleSource = readFileSync(
  fileURLToPath(
    new URL(
      "../src/routes/$ownerName/$projectName/code/$branch/-code-file.stylex.ts",
      import.meta.url,
    ),
  ),
  "utf8",
);

test("code file residual static declarations are StyleX-owned", () => {
  expect(routeSource).toContain('data-stylex-owner="project-code-file-no-files"');
  expect(routeSource).toContain('data-stylex-owner="project-code-file-open-wrap"');
  expect(routeSource).not.toContain('style={{ borderTop: 0, paddingLeft: "23px" }}');
  expect(routeSource).toContain('style={{ display: "inline-block", position: "relative" }}');
  expect(styleSource).toContain("noFiles:");
  expect(styleSource).toContain('paddingLeft: "23px"');
});
