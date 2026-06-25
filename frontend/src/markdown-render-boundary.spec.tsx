import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const serverRenderedHtmlFieldAccessPattern =
  /\.(?:bodyHtml|contentsHtml|historyHtml|descriptionHtml|renderedHtml|markdownHtml)\b/;
const serverRenderedHtmlCompatibilityFiles = new Set([
  "api/boards.ts",
  "api/code-commits.ts",
  "api/issue-meta.ts",
  "api/milestones.ts",
  "api/pull-requests.ts",
  "app-view-models.ts",
]);

function listSourceFiles(directory = __dirname): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return listSourceFiles(entryPath);
    }
    if (!entry.isFile() || !/\.[cm]?[jt]sx?$/.test(entry.name)) {
      return [];
    }
    return [path.relative(__dirname, entryPath)];
  });
}

function listRenderSurfaceFiles() {
  return listSourceFiles().filter(
    (file) =>
      !file.endsWith(".spec.ts") &&
      !file.endsWith(".spec.tsx") &&
      !file.endsWith(".test.ts") &&
      !file.endsWith(".test.tsx") &&
      !file.endsWith(".gen.ts") &&
      !file.endsWith(".d.ts") &&
      !serverRenderedHtmlCompatibilityFiles.has(file),
  );
}

function readSource(relativePath: string) {
  return fs.readFileSync(path.resolve(__dirname, relativePath), "utf8");
}

describe("Markdown render boundary", () => {
  it("keeps React render surfaces off server-rendered HTML fields", () => {
    for (const file of listRenderSurfaceFiles()) {
      const source = readSource(file);
      expect(source, file).not.toContain("dangerouslySetInnerHTML");
      expect(source, file).not.toMatch(serverRenderedHtmlFieldAccessPattern);
    }
  });

  it("keeps server HTML compatibility fields in API/view-model mapping only", () => {
    const compatibilitySources = Array.from(serverRenderedHtmlCompatibilityFiles, readSource);

    for (const source of compatibilitySources) {
      expect(source).not.toContain("dangerouslySetInnerHTML");
    }

    expect(compatibilitySources.join("\n")).toContain("bodyHtml");
    expect(compatibilitySources.join("\n")).toContain("contentsHtml");
  });
});
