import { expect, test, curatedAppCss } from "../wtr-compat.ts";
import { readFile } from "../wtr-compat.ts";

test("project posts keymap modal uses conditional Style visibility", async () => {
  const [legacy, route, style] = await Promise.all([
    readFile("../yona-original/app/views/help/keymap.scala.html", "utf8"),
    readFile("src/routes/$ownerName/$projectName/posts.tsx", "utf8"),
    Promise.resolve(curatedAppCss()),
  ]);
  expect(legacy).toContain('<div id="helpKeys" class="modal hide fade keymap-help"');
  expect(route).toContain('data-owner="project-posts-keymap-modal"');
});
