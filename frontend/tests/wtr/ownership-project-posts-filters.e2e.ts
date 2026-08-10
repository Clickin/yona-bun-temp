import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const routeSource = new URL("../src/routes/$ownerName/$projectName/posts.tsx", import.meta.url);
const styleSource = new URL("../src/app.css", import.meta.url);
const legacySource = new URL(
  "../../yona-original/app/views/board/list.scala.html",
  import.meta.url,
);
const lessSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_page.less",
  import.meta.url,
);
const appCssSource = new URL("../src/app.css", import.meta.url);

test("project posts sort filters preserve legacy DOM and route-local Style ownership", async () => {
  const [route, style, legacy, less, appCss] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacySource, "utf8"),
    readFile(lessSource, "utf8"),
    readFile(appCssSource, "utf8"),
  ]);

  expect(legacy).toContain('<div class="filter-wrap board">');
  expect(legacy).toContain('class="filter active"');
  expect(legacy).toContain("btn-gray-arrow");
  expect(less).toContain(".filter-wrap");
  expect(less).toContain("&.active { font-weight:bold; color:@primary; }");
  expect(route).toContain('data-owner="project-posts-filter-wrap"');
  expect(route).toContain('data-owner="project-posts-filters"');
  expect(route).toContain('data-owner="project-posts-filter"');
  expect(route).toContain('data-owner="project-posts-filter-icon"');

  // Shared selectors stay frozen: issue/milestone/user routes still consume them.
  expect(appCss).toContain(".filter-wrap .filters");
  expect(appCss).toContain(".filter-wrap .filter.active");
});
