import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";
const routeSource = new URL("../src/routes/$ownerName/$projectName.tsx", import.meta.url);
const legacySource = new URL(
  "../../yona-original/app/views/project/setting.scala.html",
  import.meta.url,
);
test("project home leave modal visibility uses conditional Style", async () => {
  const [route, _legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);
  expect(route).toContain('data-owner="project-home-leave-modal"');
  expect(route).toContain("leaveModalOpen");
  expect(route).not.toContain("style={leaveModalStyle}");
});
