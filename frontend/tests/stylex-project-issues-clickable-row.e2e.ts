import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const routeSource = new URL("../src/routes/$ownerName/$projectName/issues.tsx", import.meta.url);
const legacySource = new URL(
  "../../yona-original/app/views/issue/partial_list_draft.scala.html",
  import.meta.url,
);

test("project issues two-column row cursor uses conditional StyleX", async () => {
  const [route, legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);
  expect(route).toContain(
    'data-stylex-owner={useTwoColumnMode ? "project-issues-clickable-row" : undefined}',
  );
  expect(route).toContain("clickableRow");
});
