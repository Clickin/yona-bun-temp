import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = "../src/routes/$ownerName/$projectName/issueform.tsx";
const styleSource = "../src/routes/$ownerName/$projectName/-issueform.stylex.ts";
const legacySource = "../yona-original/app/views/issue/create.scala.html";

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
