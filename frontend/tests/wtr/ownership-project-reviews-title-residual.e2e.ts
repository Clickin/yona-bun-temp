import { readFile, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const legacyListSource = new URL(
  "../../yona-original/app/views/reviewthread/list.scala.html",
  import.meta.url,
);
const legacyPartialSource = new URL(
  "../../yona-original/app/views/reviewthread/partial_list.scala.html",
  import.meta.url,
);

const routeSource = new URL("../src/routes/$ownerName/$projectName/reviews.tsx", import.meta.url);

test("project reviews title residual fallback is retired", async () => {
  const [legacyList, legacyPartial, css, route, _style] = await Promise.all([
    readFile(legacyListSource, "utf8"),
    readFile(legacyPartialSource, "utf8"),
    Promise.resolve(curatedAppCss()),
    readFile(routeSource, "utf8"),
    Promise.resolve(curatedAppCss()),
  ]);

  expect(legacyList).toContain('<div class="review-list-wrap">');
  expect(legacyPartial).toContain('<ul class="post-list-wrap">');
  expect(legacyPartial).toContain('<div class="title-wrap">');
  expect(legacyPartial).toContain(
    '<a href="@DiffRenderer.urlToCommentThread(thread)" class="title">',
  );

  expect(route).toContain('data-owner="project-reviews-title-wrap"');
  expect(route).toContain('data-owner="project-reviews-title"');

  expect(css).not.toContain(".review-list-wrap .post-item .title-wrap {");
  expect(css).not.toContain(".review-list-wrap .post-item .title-wrap .title {");
  expect(css).toContain(".post-list-wrap .post-item .title-wrap");
});
