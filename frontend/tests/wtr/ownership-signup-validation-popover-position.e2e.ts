import { readFile, readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";
const fileURLToPath = (u: URL) => u.pathname;

test("signup validation popover coordinates use Dynamic Style", async () => {
  const [legacy, route, style] = await Promise.all([
    readFile(
      fileURLToPath(
        new URL("../../yona-original/app/views/user/signup.scala.html", import.meta.url),
      ),
      "utf8",
    ),
    readFile(fileURLToPath(new URL("../src/routes/users/signupform.tsx", import.meta.url)), "utf8"),
    readFileSync(fileURLToPath(new URL("../src/app.css", import.meta.url)), "utf8") +
      readFileSync(
        fileURLToPath(
          new URL(
            "../frontend/public/legacy-assets/stylesheets/legacy-fallback.css",
            import.meta.url,
          ),
        ),
        "utf8",
      ),
  ]);
  expect(legacy).toContain("signup-form-wrap");
});
