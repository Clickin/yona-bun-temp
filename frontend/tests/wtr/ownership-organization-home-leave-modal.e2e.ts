import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("organization home leave modal uses conditional Style visibility", async () => {
  const [legacy, route, style] = await Promise.all([
    readFile("../yona-original/app/views/organization/view.scala.html", "utf8"),
    readFile("src/routes/organizations/$organizationName.tsx", "utf8"),
    readFile("src/app.css", "utf8"),
  ]);
  expect(legacy).toContain('id="groupLeaveBtn"');
  expect(route).toContain('data-owner="organization-home-leave-modal"');
});
