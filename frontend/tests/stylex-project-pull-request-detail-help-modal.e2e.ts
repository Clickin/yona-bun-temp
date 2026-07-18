import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("pull-request detail owns help-modal visibility in conditional StyleX", () => {
  const route = readFileSync(
    "src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber.tsx",
    "utf8",
  );
  const stylex = readFileSync(
    "src/routes/$ownerName/$projectName/pullRequest/-pull-request-detail.stylex.ts",
    "utf8",
  );
  const template = readFileSync("../yona-original/app/views/git/view.scala.html", "utf8");

  expect(template).toContain('<div id="helpMessage" class="modal hide fade pullreq-info">');
  expect(route).toContain('data-stylex-owner="pull-request-detail-help-modal"');
  expect(route).toContain("styles.helpModalVisible");
  expect(route).toContain("styles.helpModalHidden");
  expect(route).not.toContain("style={modalStyle}");
  expect(stylex).toContain('helpModalVisible: { display: "block" }');
  expect(stylex).toContain('helpModalHidden: { display: "none" }');
});
