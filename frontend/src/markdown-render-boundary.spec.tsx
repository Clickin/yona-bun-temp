import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const serverRenderedHtmlFieldAccessPattern =
  /\.(?:bodyHtml|contentsHtml|historyHtml|descriptionHtml|renderedHtml|markdownHtml)\b/;

function listRouteFiles(directory = path.resolve(__dirname, "routes")): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return listRouteFiles(entryPath);
    }
    if (!entry.isFile() || !entry.name.endsWith(".tsx")) {
      return [];
    }
    return [path.relative(__dirname, entryPath)];
  });
}

function readSource(relativePath: string) {
  return fs.readFileSync(path.resolve(__dirname, relativePath), "utf8");
}

describe("Markdown render boundary", () => {
  it("keeps React routes off server-rendered HTML fields", () => {
    for (const file of listRouteFiles()) {
      const source = readSource(file);
      expect(source, file).not.toContain("dangerouslySetInnerHTML");
      expect(source, file).not.toMatch(serverRenderedHtmlFieldAccessPattern);
    }
  });

  it("keeps server HTML compatibility fields in typed API mapping only", () => {
    const apiSources = [
      "api/boards.ts",
      "api/code-commits.ts",
      "api/issue-meta.ts",
      "api/milestones.ts",
      "api/pull-requests.ts",
    ].map(readSource);

    for (const source of apiSources) {
      expect(source).not.toContain("dangerouslySetInnerHTML");
    }

    expect(apiSources.join("\n")).toContain("bodyHtml");
    expect(apiSources.join("\n")).toContain("contentsHtml");
  });
});
