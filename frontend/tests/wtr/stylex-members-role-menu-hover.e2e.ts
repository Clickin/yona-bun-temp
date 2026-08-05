import { readFileSync, expect, test } from "../wtr-compat.ts";

test("member role menus own hover and focus paint in StyleX", async () => {
  const project = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/members.tsx", import.meta.url),
    "utf8",
  );
  const organization = readFileSync(
    new URL("../src/routes/organizations/$organizationName/members.tsx", import.meta.url),
    "utf8",
  );
  const css = readFileSync(new URL("../src/app.css", import.meta.url), "utf8");
  for (const source of [project, organization]) {
    expect(source).toContain('":hover"');
    expect(source).toContain('":focus"');
    expect(source).toContain('backgroundImage: "linear-gradient(to bottom, #08c, #0077b3)"');
  }
  expect(css).not.toContain(
    ".members.project .member .member-setting .dropdown-menu > li > button:hover",
  );
  expect(css).not.toContain(
    ".members.project .member .member-setting .dropdown-menu > li > button:focus",
  );
});
