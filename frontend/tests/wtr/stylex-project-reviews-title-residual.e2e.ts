import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const legacyListSource = new URL(
  "../../yona-original/app/views/reviewthread/list.scala.html",
  import.meta.url,
);
const legacyPartialSource = new URL(
  "../../yona-original/app/views/reviewthread/partial_list.scala.html",
  import.meta.url,
);
const cssSource = new URL("../src/app.css", import.meta.url);
const routeSource = new URL("../src/routes/$ownerName/$projectName/reviews.tsx", import.meta.url);
const styleSource = new URL(
  "../src/routes/$ownerName/$projectName/-reviews.stylex.ts",
  import.meta.url,
);

test("project reviews title residual fallback is retired", async () => {
  const [legacyList, legacyPartial, css, route, style] = await Promise.all([
    readFile(legacyListSource, "utf8"),
    readFile(legacyPartialSource, "utf8"),
    readFile(cssSource, "utf8"),
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
  ]);

  expect(legacyList).toContain('<div class="review-list-wrap">');
  expect(legacyPartial).toContain('<ul class="post-list-wrap">');
  expect(legacyPartial).toContain('<div class="title-wrap">');
  expect(legacyPartial).toContain(
    '<a href="@DiffRenderer.urlToCommentThread(thread)" class="title">',
  );

  expect(route).toContain('data-stylex-owner="project-reviews-title-wrap"');
  expect(route).toContain('data-stylex-owner="project-reviews-title"');
  expect(route).toContain("reviewsLayout.reviewTitleWrap");
  expect(route).toContain("reviewsLayout.reviewTitle");
  expect(route).toMatch(/className={`title-wrap \$\{reviewTitleWrapProps\.className/);
  expect(route).toMatch(
    /const reviewTitleProps = stylex\.props\(styles\.title, reviewsLayout\.reviewTitle\)/,
  );
  expect(route).toMatch(/className={`title \$\{reviewTitleProps\.className/);

  expect(style).toContain('display: "block"');
  expect(style).toContain('overflow: "hidden"');
  expect(style).toContain('textOverflow: "ellipsis"');
  expect(style).toContain('whiteSpace: "nowrap"');
  expect(style).toContain('overflowWrap: "normal"');

  expect(css).not.toContain(".review-list-wrap .post-item .title-wrap {");
  expect(css).not.toContain(".review-list-wrap .post-item .title-wrap .title {");
  expect(css).toContain(".post-list-wrap .post-item .title-wrap");
});
