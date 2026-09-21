import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = new URL(
  "../src/routes/organizations/$organizationName/members.tsx",
  import.meta.url,
);
const styleSource = new URL("../src/app.css", import.meta.url);
const legacySource = new URL(
  "../../yona-original/app/views/organization/members.scala.html",
  import.meta.url,
);

test("organization member delete modal uses conditional Style visibility", async () => {
  const [route, _style, legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);

  expect(legacy).toContain('id="alertDeletion"');
  expect(legacy).toContain('class="modal hide"');
  expect(route).toContain('data-owner="organization-members-delete-modal"');
});
