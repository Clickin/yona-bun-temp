import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

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
  expect(template).toContain('<div class="right-txt">');
  expect(route).toContain('data-stylex-owner="pull-request-detail-help-modal"');
  expect(route).toContain('data-stylex-owner="pull-request-detail-help-actions"');
  expect(route).not.toContain('className="right-txt"');
  expect(route).toContain("styles.helpModalVisible");
  expect(route).toContain("styles.helpModalHidden");
  expect(route).not.toContain("style={modalStyle}");
  expect(stylex).toContain('helpModalVisible: { display: "block" }');
  expect(stylex).toContain('helpModalHidden: { display: "none" }');
  expect(stylex).toContain('helpActions: { textAlign: "right" }');
});
