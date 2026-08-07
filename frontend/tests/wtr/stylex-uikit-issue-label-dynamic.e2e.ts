import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("UIKit issue label uses Dynamic StyleX color and static text paint", async () => {
  const [route, style] = await Promise.all([
    readFile("src/routes/[_]UIKit.tsx", "utf8"),
    readFile("src/routes/-UIKit.stylex.ts", "utf8"),
  ]);
  expect(route).toContain('data-stylex-owner="uikit-issue-label"');
  expect(route).toContain("sx.styles.issueLabelBackground(color)");
  expect(route).toContain("sx.styles.issueLabelText");
  expect(route).not.toContain('style={{ backgroundColor: color, color: "#fff" }}');
  expect(style).toContain(
    "issueLabelBackground: (backgroundColor: string) => ({ backgroundColor })",
  );
  expect(style).toContain('issueLabelText: { color: "#fff" }');
});
