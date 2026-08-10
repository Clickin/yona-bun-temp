import { expect, test } from "../wtr-compat.ts";
import { readFile } from "../wtr-compat.ts";

test("post detail modal states use conditional Style visibility", async () => {
  const [legacy, route, style, appCss] = await Promise.all([
    readFile("../yona-original/app/views/board/view.scala.html", "utf8"),
    readFile("src/routes/$ownerName/$projectName/post/$postNumber.tsx", "utf8"),
    readFile("src/app.css", "utf8"),
    readFile("src/app.css", "utf8"),
  ]);
  expect(legacy).toContain('href="#-yona-posting-history"');
  expect(legacy).toContain("commentDeleteModal");
  expect(route).toContain('data-owner="post-detail-history-modal"');
  expect(route).toContain('data-owner="post-detail-comment-delete-modal"');

  expect(appCss).not.toContain('.board-view .posting-history > button[data-toggle="modal"]');
  expect(appCss).not.toContain('.posting-history > button[data-toggle="modal"]');
  expect(appCss).not.toContain('.voter-list li > button[data-toggle="modal"]');
  expect(appCss).not.toContain('.vote-description-people[data-toggle="modal"]');
});
