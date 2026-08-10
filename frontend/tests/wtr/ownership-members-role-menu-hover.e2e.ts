import { readFileSync, expect, test } from "../wtr-compat.ts";

test("member role menus own hover and focus paint in Style", async () => {
  const css = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");
  expect(css).not.toContain(
    ".members.project .member .member-setting .dropdown-menu > li > button:hover",
  );
  expect(css).not.toContain(
    ".members.project .member .member-setting .dropdown-menu > li > button:focus",
  );
});
