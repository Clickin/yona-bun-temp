import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

test("signup validation popover coordinates use Dynamic StyleX", async () => {
  const [legacy, route, style] = await Promise.all([
    readFile(
      fileURLToPath(
        new URL("../../yona-original/app/views/user/signup.scala.html", import.meta.url),
      ),
      "utf8",
    ),
    readFile(fileURLToPath(new URL("../src/routes/users/signupform.tsx", import.meta.url)), "utf8"),
    readFile(
      fileURLToPath(new URL("../src/routes/users/-signupform.stylex.ts", import.meta.url)),
      "utf8",
    ),
  ]);
  expect(legacy).toContain("signup-form-wrap");
  expect(route).toContain("signupFormDynamicStyles.validationPopoverPosition");
  expect(route).not.toContain('"--yoram-stylex-validation-popover-left": position.left');
  expect(route).not.toContain('"--yoram-stylex-validation-popover-top": position.top');
  expect(style).toContain(
    "validationPopoverPosition: (left: string, top: string) => ({ left, top })",
  );
});
