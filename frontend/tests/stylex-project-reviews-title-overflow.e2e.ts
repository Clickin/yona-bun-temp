import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
const legacySource = new URL(
  "../../yona-original/app/views/reviewthread/list.scala.html",
  import.meta.url,
);
const cssSource = new URL("../src/app.css", import.meta.url);
const routeSource = new URL("../src/routes/$ownerName/$projectName/reviews.tsx", import.meta.url);
const styleSource = new URL(
  "../src/routes/$ownerName/$projectName/-reviews.stylex.ts",
  import.meta.url,
);

test("project reviews title overflow uses route-local StyleX", async () => {
  const [legacy, css, route, style] = await Promise.all([
    readFile(legacySource, "utf8"),
    readFile(cssSource, "utf8"),
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
  ]);
  expect(legacy).toContain('class="review-list-wrap"');
  expect(css).toContain(".review-list-wrap .post-item .title-wrap");
  expect(route).toContain('data-stylex-owner="project-reviews-title-wrap"');
  expect(route).toContain("reviewsLayout.reviewTitleWrap");
  expect(route).toContain("reviewsLayout.reviewTitle");
  expect(style).toContain('textOverflow: "ellipsis"');
  expect(style).toContain('overflowWrap: "normal"');
});
