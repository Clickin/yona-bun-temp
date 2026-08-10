import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

// Browser harness: node:fs/promises readFile has no browser equivalent; the
// compat readFileSync is a sync XHR over the same middleware. Promise-wrap it
// so the spec's await/Promise.all call sites keep their shape.
const readFile = (path: string | URL, encoding?: string | null): Promise<string> =>
  Promise.resolve(readFileSync(path, encoding ?? "utf8"));

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = new URL("../src/routes/sites/postList.tsx", import.meta.url);
const legacyTemplateSource = new URL(
  "../../yona-original/app/views/site/postList.scala.html",
  import.meta.url,
);
const legacyCommonLessSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_common.less",
  import.meta.url,
);

test("source retires only the pagination input nospinner residual", async () => {
  const [route, template, commonLess] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(legacyTemplateSource, "utf8"),
    readFile(legacyCommonLessSource, "utf8"),
  ]);

  expect(template).toContain('<div id="pagination"></div>');
  expect(template).toContain("yobi.Pagination.update");
  expect(commonLess).toContain(".nospinner { -moz-appearance:textfield; }");
  expect(route).toContain('data-owner="site-post-list-pagination-input"');
  expect(route).not.toContain("className={`nospinner");
  expect(route).not.toContain("className={`ico btn-pg-prev");
  expect(route).not.toContain("className={`ico btn-pg-next");
  expect(route).not.toContain("className={`yobicon-comments");
});

test("keeps the populated pagination input semantics without the presentation class", async ({
  page,
}) => {
  await installPopulatedPostList(page);
  await page.goto(`${basePath}/sites/postList?pageNum=1`);

  const input = page.locator('[data-owner="site-post-list-pagination-input"]');
  await expect(input).toHaveCount(1);
  await expect(input).toHaveAttribute("name", "pageNum");
  await expect(input).toHaveAttribute("type", "number");
  await expect(input).toHaveAttribute("pattern", "[0-9]*");
  await expect(input).toHaveAttribute("min", "1");
  await expect(input).toHaveAttribute("max", "3");
  await expect(input).toHaveValue("1");
  await expect(input).not.toHaveClass(/\bnospinner\b/u);

  await input.fill("9");
  await input.press("Enter");
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("3");
  await expect(input).toHaveValue("3");
});

async function installPopulatedPostList(page: Page) {
  const session = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "siteboss",
      },
    });
  await page.route("**/api/v1/session", session);
  await page.route("**/api/auth/session", session);
  await page.route("**/api/v1/auth/session", session);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ contentType: "application/json", json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/posts?*", (route) => {
    const page = Number(new URL(route.request().url()).searchParams.get("page") ?? "1");
    return route.fulfill({
      contentType: "application/json",
      json: {
        page,
        pageSize: 20,
        posts: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-128.png",
            authorLabel: "Site Admin",
            authorLoginId: "admin",
            commentCount: 1,
            createdLabel: "1 day ago",
            createdTitle: "2026-07-15 12:00",
            ownerName: "admin",
            postNumber: String(page),
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "sample",
            title: "Pagination residual parity",
          },
        ],
        total: 60,
        totalPages: 3,
      },
    });
  });
}
