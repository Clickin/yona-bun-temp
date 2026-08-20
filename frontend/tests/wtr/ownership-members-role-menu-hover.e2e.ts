import { readFileSync, expect, test, curatedAppCss } from "../wtr-compat.ts";
test("member role menus own hover and focus paint in Style", async () => {
  const css = curatedAppCss();
  expect(css).not.toContain(
    ".members.project .member .member-setting .dropdown-menu > li > button:hover",
  );
  expect(css).not.toContain(
    ".members.project .member .member-setting .dropdown-menu > li > button:focus",
  );
});
