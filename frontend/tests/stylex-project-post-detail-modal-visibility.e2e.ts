import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("post detail modal states use conditional StyleX visibility", async () => {
  const [legacy, route, style] = await Promise.all([
    readFile("../yona-original/app/views/board/view.scala.html", "utf8"),
    readFile("src/routes/$ownerName/$projectName/post/$postNumber.tsx", "utf8"),
    readFile("src/routes/$ownerName/$projectName/post/-post-detail.stylex.ts", "utf8"),
  ]);
  expect(legacy).toContain('href="#-yona-posting-history"');
  expect(route).toContain('data-stylex-owner="post-detail-history-modal"');
  expect(route).toContain('data-stylex-owner="post-detail-comment-delete-modal"');
  expect(route).toContain("styles.historyModalVisible");
  expect(route).toContain("styles.commentDeleteVisible");
  expect(route).not.toContain('style={open ? { display: "block" } : undefined}');
  expect(style).toContain('historyModalVisible: { display: "block" }');
  expect(style).toContain('commentDeleteVisible: { display: "block" }');
});
