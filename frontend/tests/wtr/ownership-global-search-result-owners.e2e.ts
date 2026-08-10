import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("global search populated and empty states retain legacy-backed Style owners", async () => {
  const route = await readFile("src/routes/search.tsx", "utf8");
  const style = await readFile("src/app.css", "utf8");
  const template = await readFile("../yona-original/app/views/search/result.scala.html", "utf8");
  const partial = await readFile(
    "../yona-original/app/views/search/partial_search.scala.html",
    "utf8",
  );
  const pageLess = await readFile(
    "../yona-original/app/assets/stylesheets/less/_page.less",
    "utf8",
  );
  expect(template).toContain("partial_search");
  expect(partial).toContain("search-category-wrap");
  for (const declaration of [
    ".search-box-wrap",
    ".search-list-wrap",
    ".search-list-item",
    ".search-category-wrap",
  ]) {
    expect(pageLess).toContain(declaration);
  }
  for (const owner of [
    "global-search-category",
    "global-search-result-heading",
    "global-search-result-list",
    "global-search-result-item",
  ]) {
    expect(route).toContain(`data-owner="${owner}"`);
  }
});
