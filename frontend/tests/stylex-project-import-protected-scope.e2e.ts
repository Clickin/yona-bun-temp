import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const routeSource = new URL("../src/routes/[_]import.tsx", import.meta.url);
const styleSource = new URL("../src/routes/-project-import.stylex.ts", import.meta.url);
const legacySource = new URL(
  "../../yona-original/app/views/project/importing.scala.html",
  import.meta.url,
);

test("project import protected scope uses conditional StyleX", async () => {
  const [route, style, legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);

  expect(legacy).toContain('id="opt-protected"');
  expect(legacy).toContain('style="display:none;"');
  expect(route).toContain("styles.protectedScopeHidden");
  expect(route).not.toContain('style={isSelectedOwnerGroup ? undefined : { display: "none" }}');
  expect(style).toContain('protectedScopeHidden: { display: "none" }');
});
