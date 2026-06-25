import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const serverRenderedHtmlFieldAccessPattern =
  /(?:\.(?:bodyHtml|contentsHtml|historyHtml|descriptionHtml|renderedHtml|markdownHtml)\b|\[\s*["'](?:bodyHtml|contentsHtml|historyHtml|descriptionHtml|renderedHtml|markdownHtml)["']\s*\]|\{[^}\n]*\b(?:bodyHtml|contentsHtml|historyHtml|descriptionHtml|renderedHtml|markdownHtml)\b[^}\n]*\})/;
const htmlFragmentDomApiPattern =
  /\b(?:DOMParser|insertAdjacentHTML|createContextualFragment|innerHTML|outerHTML)\b|dangerouslySetInnerHTML/;
const routeHtmlFragmentFetchPattern = /\bresponse\.text\(|\btext\/html\b/;
const responseTextReadPattern = /\bresponse\.text\(/;
const markdownWrapClassPattern = /\bmarkdown-wrap\b/;
const reactMarkdownDirectUsePattern =
  /from\s+["']react-markdown["']|require\(\s*["']react-markdown["']\s*\)|<ReactMarkdown\b/;
const markdownPipelineDirectUsePattern =
  /from\s+["'](?:react-markdown|rehype-raw|rehype-sanitize|remark-breaks|remark-gfm|unified|remark-parse|rehype-stringify|marked|markdown-it|micromark|showdown|commonmark)["']|require\(\s*["'](?:react-markdown|rehype-raw|rehype-sanitize|remark-breaks|remark-gfm|unified|remark-parse|rehype-stringify|marked|markdown-it|micromark|showdown|commonmark)["']\s*\)|<ReactMarkdown\b/;
const forbiddenMarkdownRuntimeDependencies = [
  "marked",
  "markdown-it",
  "micromark",
  "showdown",
  "commonmark",
  "unified",
  "remark-parse",
  "rehype-stringify",
];
const allowedMarkdownRuntimeDependencies = [
  "react-markdown",
  "rehype-raw",
  "rehype-sanitize",
  "remark-breaks",
  "remark-gfm",
];
const serverRenderedHtmlCompatibilityFiles = new Set([
  "api/boards.ts",
  "api/code-commits.ts",
  "api/issue-meta.ts",
  "api/milestones.ts",
  "api/pull-requests.ts",
]);
const allowedReactMarkdownDirectUseFiles = new Set(["routes/-markdown-renderer.tsx"]);
const allowedResponseTextReaders = new Set(["api/rest-client.ts", "api/translation.ts"]);
const renderModelBoundaryFiles = ["app-view-models.ts", "auth-workspace-client.ts"];
const allowedMarkdownRendererCallsWithoutMarkdownWrap = [
  {
    file: "routes/-board-views.tsx",
    marker: /className="modal-body"/,
    reason: "legacy common/partial_history.scala.html renders sanitized history inside modal-body",
  },
  {
    file: "routes/-board-views.tsx",
    marker: /translatedCommentMarkdownById\[childComment\.id\]/,
    reason:
      "legacy common/childComments.scala.html renders one-line child comments without markdown-wrap",
  },
  {
    file: "routes/-issue-views.tsx",
    marker: /className="modal-body"/,
    reason: "legacy common/partial_history.scala.html renders sanitized history inside modal-body",
  },
  {
    file: "routes/-issue-views.tsx",
    marker: /markdown=\{childComment\.contentsMarkdown\}/,
    reason:
      "legacy common/childComments.scala.html renders one-line child comments without markdown-wrap",
  },
];

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

function openingTagEnd(source: string, start: number) {
  let braceDepth = 0;
  let quote: '"' | "'" | "`" | null = null;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    const previous = source[index - 1];
    if (quote) {
      if (char === quote && previous !== "\\") {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") {
      braceDepth += 1;
      continue;
    }
    if (char === "}") {
      braceDepth = Math.max(0, braceDepth - 1);
      continue;
    }
    if (char === ">" && braceDepth === 0) {
      return index + 1;
    }
  }
  return source.length;
}

function markdownRendererCallsWithoutMarkdownWrap() {
  const calls: Array<{ file: string; tag: string }> = [];
  for (const file of listSourceFiles(path.resolve(__dirname, "routes"))) {
    const source = readSource(file);
    for (const match of source.matchAll(/<MarkdownRenderer\b/g)) {
      const tagStart = match.index ?? 0;
      const tag = source.slice(tagStart, openingTagEnd(source, tagStart));
      if (!markdownWrapClassPattern.test(tag)) {
        calls.push({ file, tag });
      }
    }
  }
  return calls;
}

describe("Markdown render boundary", () => {
  it("keeps React render surfaces off server-rendered HTML fields", () => {
    for (const file of listRenderSurfaceFiles()) {
      const source = readSource(file);
      expect(source, file).not.toContain("dangerouslySetInnerHTML");
      expect(source, file).not.toMatch(serverRenderedHtmlFieldAccessPattern);
    }
  });

  it("keeps React render surfaces from parsing or inserting legacy HTML fragments", () => {
    for (const file of listRenderSurfaceFiles()) {
      expect(readSource(file), file).not.toMatch(htmlFragmentDomApiPattern);
    }
  });

  it("keeps route components from fetching server-rendered HTML fragments", () => {
    for (const file of listSourceFiles(path.resolve(__dirname, "routes"))) {
      expect(readSource(file), file).not.toMatch(routeHtmlFragmentFetchPattern);
    }
  });

  it("keeps response text reads limited to JSON/source compatibility helpers", () => {
    const actual = listSourceFiles()
      .filter(
        (file) =>
          !file.endsWith(".spec.ts") &&
          !file.endsWith(".spec.tsx") &&
          !file.endsWith(".test.ts") &&
          !file.endsWith(".test.tsx") &&
          responseTextReadPattern.test(readSource(file)),
      )
      .sort();

    expect(
      actual,
      "New response.text() readers can reintroduce legacy HTML-fragment fetch paths; keep them in explicit JSON/source compatibility helpers only.",
    ).toEqual(Array.from(allowedResponseTextReaders).sort());
  });

  it("keeps server HTML compatibility fields inside API compatibility modules only", () => {
    const compatibilitySources = Array.from(serverRenderedHtmlCompatibilityFiles, readSource);

    for (const source of compatibilitySources) {
      expect(source).not.toContain("dangerouslySetInnerHTML");
    }

    expect(compatibilitySources.join("\n")).toContain("bodyHtml");
    expect(compatibilitySources.join("\n")).toContain("contentsHtml");
  });

  it("keeps render view-model boundaries off server HTML compatibility fields", () => {
    for (const file of renderModelBoundaryFiles) {
      expect(readSource(file), file).not.toMatch(
        /\b(?:bodyHtml|contentsHtml|historyHtml|descriptionHtml|renderedHtml|markdownHtml)\b/,
      );
    }
  });

  it("keeps MarkdownRenderer calls wrapped like legacy markdown surfaces", () => {
    const actual = markdownRendererCallsWithoutMarkdownWrap();

    expect(
      actual,
      `Every MarkdownRenderer displaying legacy markdown content should carry markdown-wrap unless it matches a documented legacy exception.`,
    ).toHaveLength(allowedMarkdownRendererCallsWithoutMarkdownWrap.length);

    for (const allowed of allowedMarkdownRendererCallsWithoutMarkdownWrap) {
      expect(
        actual.some((call) => call.file === allowed.file && allowed.marker.test(call.tag)),
        allowed.reason,
      ).toBe(true);
    }
  });

  it("keeps direct ReactMarkdown usage owned by the legacy compatibility renderer", () => {
    const actual = listRenderSurfaceFiles()
      .filter((file) => reactMarkdownDirectUsePattern.test(readSource(file)))
      .sort();

    expect(
      actual,
      "Legacy markdown content must go through MarkdownRenderer so the Yona compatibility plugins and sanitizer cannot be bypassed.",
    ).toEqual(Array.from(allowedReactMarkdownDirectUseFiles).sort());
  });

  it("keeps Markdown parser and sanitizer package usage owned by the renderer boundary", () => {
    const actual = listRenderSurfaceFiles()
      .filter((file) => markdownPipelineDirectUsePattern.test(readSource(file)))
      .sort();

    expect(
      actual,
      "Markdown parser/sanitizer packages must stay behind MarkdownRenderer so route surfaces cannot build a second markdown pipeline.",
    ).toEqual(Array.from(allowedReactMarkdownDirectUseFiles).sort());
  });

  it("keeps alternate Markdown renderers out of frontend runtime dependencies", () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "..", "package.json"), "utf8"),
    ) as { dependencies?: Record<string, string> };
    const dependencies = packageJson.dependencies ?? {};

    expect(
      Object.keys(dependencies).filter((name) =>
        forbiddenMarkdownRuntimeDependencies.includes(name),
      ),
    ).toEqual([]);
    for (const dependency of allowedMarkdownRuntimeDependencies) {
      expect(dependencies).toHaveProperty(dependency);
    }
  });

  it("keeps ReactMarkdown wired through the Yona legacy compatibility plugins", () => {
    const source = readSource("routes/-markdown-renderer.tsx");

    expect(source).toContain("function remarkYonaAutolinks(context: MarkdownContext)");
    expect(source).toContain("function rehypeYonaRawHtmlCompatibility(");
    expect(source).toContain("function rehypeYonaRenderedDomCompatibility(");
    expect(source).toContain("const yonaMarkdownSanitizeSchema");
    expect(source).toContain("urlTransform={reactMarkdownUrlTransform}");
    expect(source).toContain("components={reactMarkdownComponents(props.context)}");
    expect(source).toContain("remarkYonaAutolinks(props.context)");
    expect(source).toContain("rehypeYonaRawHtmlCompatibility(preprocessed.opaqueRawHtmlBlocks");
    expect(source).toContain("rehypeYonaRenderedDomCompatibility");
    expect(source).toContain("toggleLegacyTasklistMarkdownItem(");
    expect(source).toContain("highlightCodeBlock(code, language)");
    expect(source).toContain('parseTextWithAutolinks(value, "react-markdown", context)');
  });
});
