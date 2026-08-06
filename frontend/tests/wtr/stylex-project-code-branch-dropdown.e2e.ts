import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("code branch Select2 dropdown owns open geometry in conditional StyleX", () => {
  const route = readFileSync("src/routes/$ownerName/$projectName/code/$branch.tsx", "utf8");
  const theme = readFileSync("src/routes/$ownerName/$projectName/-code-branch.stylex.ts", "utf8");
  const template = readFileSync("../yona-original/app/views/code/view.scala.html", "utf8");
  expect(template).toContain('data-toggle="select2"');
  expect(route).toContain('data-stylex-owner="project-code-branch-picker-drop"');
  expect(route).toContain("styles.pickerDropOpen");
  expect(route).not.toContain(
    'style={branchMenuOpen ? { display: "block", width: 220 } : undefined}',
  );
  expect(theme).toContain('pickerDropOpen: { display: "block", width: "220px" }');
});
