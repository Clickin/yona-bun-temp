import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = "src/routes/[_]import.tsx";
const styleSource = "src/routes/-project-import.stylex.ts";
const legacySource = "../yona-original/app/views/project/importing.scala.html";

test("project import protected scope uses conditional StyleX", async () => {
  const [route, style, legacy] = [
    readFileSync(routeSource, "utf8"),
    readFileSync(styleSource, "utf8"),
    readFileSync(legacySource, "utf8"),
  ];

  expect(legacy).toContain('id="opt-protected"');
  expect(legacy).toContain('style="display:none;"');
  expect(route).toContain("styles.protectedScopeHidden");
  expect(route).not.toContain('style={isSelectedOwnerGroup ? undefined : { display: "none" }}');
  expect(style).toContain('protectedScopeHidden: { display: "none" }');
});
