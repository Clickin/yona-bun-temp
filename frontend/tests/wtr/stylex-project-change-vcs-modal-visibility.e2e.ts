import { expect, test } from "../wtr-compat.ts";
import { readFile } from "../wtr-compat.ts";

test("change VCS modal visibility uses conditional StyleX", async () => {
  const [legacy, route] = await Promise.all([
    readFile("../yona-original/app/views/project/partial_settingmenu.scala.html", "utf8"),
    readFile("src/routes/$ownerName/$projectName/changeVCS.tsx", "utf8"),
  ]);
  expect(legacy).toContain("changeVCS");
  expect(route).toContain('data-stylex-owner="project-change-vcs-modal"');
  expect(route).toContain("projectChangeVcsModalStateStyles.visible");
  expect(route).toContain("projectChangeVcsModalStateStyles.hidden");
  expect(route).toContain("modalStateProps");
  expect(route).not.toContain("style={\n              changeVcsModalOpen");
});
