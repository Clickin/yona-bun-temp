import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("project posts keymap modal uses conditional StyleX visibility", async () => {
  const [legacy, route, style] = await Promise.all([
    readFile("../yona-original/app/views/help/keymap.scala.html", "utf8"),
    readFile("src/routes/$ownerName/$projectName/posts.tsx", "utf8"),
    readFile("src/routes/$ownerName/$projectName/-posts.stylex.ts", "utf8"),
  ]);
  expect(legacy).toContain('<div id="helpKeys" class="modal hide fade keymap-help"');
  expect(route).toContain('data-stylex-owner="project-posts-keymap-modal"');
  expect(route).toContain("styles.keymapOpen");
  expect(route).not.toContain('style={isOpen ? { display: "block" } : undefined}');
  expect(style).toContain('keymapOpen: { display: "block" }');
});
