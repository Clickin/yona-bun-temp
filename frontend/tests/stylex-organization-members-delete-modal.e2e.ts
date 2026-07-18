import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const routeSource = new URL(
  "../src/routes/organizations/$organizationName/members.tsx",
  import.meta.url,
);
const styleSource = new URL(
  "../src/routes/organizations/$organizationName/-members.stylex.ts",
  import.meta.url,
);
const legacySource = new URL(
  "../../yona-original/app/views/organization/members.scala.html",
  import.meta.url,
);

test("organization member delete modal uses conditional StyleX visibility", async () => {
  const [route, style, legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);

  expect(legacy).toContain('id="alertDeletion"');
  expect(legacy).toContain('class="modal hide"');
  expect(route).toContain('data-stylex-owner="organization-members-delete-modal"');
  expect(route).toContain("deleteModalVisible: {");
  expect(route).not.toContain('style={deleteUserId === null ? undefined : { display: "block" }}');
  expect(style).not.toContain("globalColors");
});
