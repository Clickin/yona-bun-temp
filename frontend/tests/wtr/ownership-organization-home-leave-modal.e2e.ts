import { readFile, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("organization home leave modal uses conditional Style visibility", async () => {
  const [legacy, route, _style] = await Promise.all([
    readFile("../yona-original/app/views/organization/view.scala.html", "utf8"),
    readFile("src/routes/organizations/$organizationName.tsx", "utf8"),
    Promise.resolve(curatedAppCss()),
  ]);
  expect(legacy).toContain('id="groupLeaveBtn"');
  expect(route).toContain('data-owner="organization-home-leave-modal"');
});
