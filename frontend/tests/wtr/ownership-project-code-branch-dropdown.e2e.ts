import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("code branch Select2 dropdown owns open geometry in conditional Style", () => {
  const route = readFileSync("src/routes/$ownerName/$projectName/code/$branch.tsx", "utf8");
  const theme =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const template = readFileSync("../yona-original/app/views/code/view.scala.html", "utf8");
  expect(template).toContain('data-toggle="select2"');
  expect(route).toContain('data-owner="project-code-branch-picker-drop"');
});
