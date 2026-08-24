import { readFile, mergedLegacyBlock, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";
const fileURLToPath = (u: URL) => u.pathname;

test("signup validation popover coordinates use Dynamic Style", async () => {
  const [legacy, _route, _style] = await Promise.all([
    readFile(
      fileURLToPath(
        new URL("../../yona-original/app/views/user/signup.scala.html", import.meta.url),
      ),
      "utf8",
    ),
    readFile(fileURLToPath(new URL("../src/routes/users/signupform.tsx", import.meta.url)), "utf8"),
    curatedAppCss() + mergedLegacyBlock(),
  ]);
  expect(legacy).toContain("signup-form-wrap");
});
