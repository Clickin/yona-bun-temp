import { readFile } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("user profile static avatar/name/edit owners use route-local StyleX", () => {
  const route = readFileSync("src/routes/$user.tsx", "utf8");
  const legacy = readFileSync("../yona-original/app/views/user/view.scala.html", "utf8");
  const less = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  expect(legacy).toContain('class="whoami-wrap"');
  expect(legacy).toContain('class="name"');
  expect(less).toContain("width:200px; height:200px;");
  expect(less).toContain("font-size:18px;");
  expect(less).toContain("text-align:right;");
  expect(route).toContain("avatarWrap: {");
  expect(route).toContain('backgroundSize: "cover"');
  expect(route).toContain(
    'profileName: { fontSize: "18px", fontWeight: "bold", marginRight: "2px" }',
  );
  expect(route).toContain('profileEdit: { marginTop: "5px", textAlign: "right" }');
});
