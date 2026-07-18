import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const routeSource = new URL("../src/routes/$ownerName/$projectName/setting.tsx", import.meta.url);
const styleSource = new URL(
  "../src/routes/$ownerName/$projectName/-setting.stylex.ts",
  import.meta.url,
);
const legacySource = new URL(
  "../../yona-original/app/views/project/setting.scala.html",
  import.meta.url,
);

test("project setting default branch control uses static StyleX", async () => {
  const [route, style, legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);
  expect(legacy).toContain("project-default-branch");
  expect(route).toContain("defaultBranchChoice");
  expect(route).not.toContain('style={{\n            boxSizing: "border-box"');
  expect(style).toContain("defaultBranchChoice: {");
  expect(style).toContain('width: "100%"');
});
