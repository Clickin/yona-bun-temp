import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
const routeSource = new URL("../src/routes/__root.tsx", import.meta.url);
const legacySource = new URL(
  "../../yona-original/app/views/common/loginDialog.scala.html",
  import.meta.url,
);
test("root login dialog visibility uses conditional StyleX", async () => {
  const [route, legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);
  expect(legacy).toContain("loginDialog");
  expect(route).toContain("rootLoginDialogVisible");
  expect(route).toContain("rootLoginDialogErrorVisible");
  expect(route).not.toContain('style={visible ? { display: "block" } : undefined}');
  expect(route).not.toContain('style={state.errorMessage ? { display: "block" } : undefined}');
});
