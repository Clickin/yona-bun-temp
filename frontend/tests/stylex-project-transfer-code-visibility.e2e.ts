import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("project transfer code menu visibility uses conditional StyleX", async () => {
  const [legacy, partial, route, style] = await Promise.all([
    readFile("../yona-original/app/views/project/transfer.scala.html", "utf8"),
    readFile("../yona-original/app/views/project/partial_settingmenu.scala.html", "utf8"),
    readFile("src/routes/$ownerName/$projectName/transfer.tsx", "utf8"),
    readFile("src/routes/$ownerName/$projectName/-transfer.stylex.ts", "utf8"),
  ]);
  expect(legacy).toContain("partial_settingmenu(project)");
  expect(partial).toContain('id="subMenuProjectChangeVCS"');
  expect(partial).toContain("display:none;");
  expect(route).toContain('data-stylex-owner="project-transfer-code-menu"');
  expect(route).toContain("projectTransferConditionalStyles.hidden");
  expect(route).not.toMatch(/style=\{[^}]*display/gu);
  expect(style).toContain('hidden: { display: "none" }');
});
