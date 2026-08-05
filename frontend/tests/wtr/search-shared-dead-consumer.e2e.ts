import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("shared search module retains only the imported error and empty-result contracts", async () => {
  const shared = await readFile(
    new URL("../src/routes/-search-screen.tsx", import.meta.url),
    "utf8",
  );
  const consumers = await Promise.all(
    [
      "../src/routes/search.tsx",
      "../src/routes/$ownerName/$projectName.tsx",
      "../src/routes/$ownerName/$projectName/search.tsx",
      "../src/routes/$ownerName/$projectName/pullRequests.tsx",
      "../src/routes/$ownerName/$projectName/newFork.tsx",
      "../src/routes/organizations/$organizationName/search.tsx",
    ].map((path) => readFile(new URL(path, import.meta.url), "utf8")),
  );

  expect(shared).not.toContain("LegacySearchBody");
  expect(shared).not.toContain("function SearchResultList");
  expect(shared).not.toContain("function SearchPagination");
  expect(shared).not.toContain("function HighlightedText");
  for (const retainedExport of [
    "DefaultSearchErrorBody",
    "RequestTextTooLargeErrorBody",
    "isRequestTextTooLargeError",
    "isDefaultForbiddenError",
    "isDefaultInternalServerError",
    "emptySearchResult",
  ]) {
    expect(shared).toContain(`export function ${retainedExport}`);
    expect(consumers.some((consumer) => consumer.includes(retainedExport))).toBe(true);
  }
  expect(consumers.every((consumer) => !consumer.includes("LegacySearchBody"))).toBe(true);
});
