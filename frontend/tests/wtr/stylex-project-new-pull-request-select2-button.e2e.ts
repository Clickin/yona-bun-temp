import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("new pull-request Select2 button owns route-scoped geometry in StyleX", () => {
  const route = readFileSync("src/routes/$ownerName/$projectName/newPullRequestForm.tsx", "utf8");
  const style = readFileSync(
    "src/routes/$ownerName/$projectName/-new-pull-request.stylex.ts",
    "utf8",
  );
  const legacy = readFileSync("../yona-original/app/views/git/create.scala.html", "utf8");
  const less = readFileSync("../yona-original/app/assets/stylesheets/less/_override.less", "utf8");
  const css = readFileSync("src/app.css", "utf8");

  // Legacy Scala HTML/LESS is output DOM/UX evidence; behavior remains React-owned.
  expect(legacy).toContain('<div class="pull-request-wrap">');
  expect(legacy).toContain('data-toggle="select2"');
  expect(less).toContain(".select2-choice");
  expect(less).toContain("padding:1px 0 1px 12px");
  expect((route.match(/<PullRequestSelect2Closed/g) ?? []).length).toBe(4);
  expect(route).toContain("styles.select2Choice");
  expect(route).toContain("data-stylex-owner={`new-pull-request-${controlId}-select2-choice`}");
  expect(style).toContain('boxSizing: "border-box"');
  expect(style).toContain('width: "100%"');
  expect(style).toContain('height: "auto"');
  expect(style).toContain('textAlign: "left"');
  // The edit form still consumes this selector, so the shared fallback must remain.
  // bucket-3: the fallback in src/app.css is the generic `.select2-container
  // .select2-choice` (app.css:4113) — the pull-request-scoped `> button` form
  // was dropped once the route owned its geometry via StyleX.
  expect(css).toContain(".select2-container .select2-choice");
});
