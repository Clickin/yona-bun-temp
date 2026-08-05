import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("organization home leave modal uses conditional StyleX visibility", async () => {
  const [legacy, route, style] = await Promise.all([
    readFile("../yona-original/app/views/organization/view.scala.html", "utf8"),
    readFile("src/routes/organizations/$organizationName.tsx", "utf8"),
    readFile("src/routes/organizations/-organization-home.stylex.ts", "utf8"),
  ]);
  expect(legacy).toContain('id="groupLeaveBtn"');
  expect(route).toContain('data-stylex-owner="organization-home-leave-modal"');
  expect(route).toContain("styles.leaveModalVisible");
  expect(route).not.toContain('style={leaveModalOpen ? { display: "block" } : undefined}');
  expect(style).toContain('leaveModalVisible: { display: "block" }');
});
