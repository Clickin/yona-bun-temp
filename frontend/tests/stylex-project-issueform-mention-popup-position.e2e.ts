import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const routeSource = new URL("../src/routes/$ownerName/$projectName/issueform.tsx", import.meta.url);
const styleSource = new URL(
  "../src/routes/$ownerName/$projectName/-issueform.stylex.ts",
  import.meta.url,
);
const legacySource = new URL(
  "../../yona-original/app/views/issue/create.scala.html",
  import.meta.url,
);

test("issue form mention popup coordinates use Dynamic StyleX", async () => {
  const [route, style, legacy] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacySource, "utf8"),
  ]);
  expect(legacy).toContain("mentionList");
  expect(route).toContain("mentionPopupPosition");
  expect(route).toContain("issueFormStyles.mentionPopupPosition");
  expect(route).not.toContain("style={mentionPopupPosition}");
  expect(style).toContain("mentionPopupPosition: (left: number, top: number)");
});
