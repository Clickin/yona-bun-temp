import fs from "node:fs";
import path from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createLegacyI18nRuntime } from "./i18n";

function renderLoadingShell(
  messages: ReturnType<typeof createLegacyI18nRuntime>["t"] = (key, options) =>
    options?.fallback ?? key,
) {
  return renderToStaticMarkup(
    <main className="app-shell">
      <h1>{messages("common.loading", { fallback: "common.loading" })}</h1>
    </main>,
  );
}

describe("pull-request route loading shell legacy i18n opt-in", () => {
  it("opts PR detail and changes loading shells into legacy messages", () => {
    const routePaths = [
      "routes/$owner/$projectName/pullRequest/$pullRequestNumber/route.tsx",
      "routes/$owner/$projectName/pullRequest/$pullRequestNumber/changes/route.tsx",
    ];

    for (const routePath of routePaths) {
      const source = fs.readFileSync(path.resolve(__dirname, routePath), "utf8");

      expect(source).toContain('messages("common.loading", { fallback: "common.loading" })');
      expect(source).not.toContain("<h1>common.loading</h1>");
    }
  });

  it("keeps the exact fallback and uses Korean legacy loading copy", () => {
    expect(renderLoadingShell()).toContain("<h1>common.loading</h1>");

    const runtime = createLegacyI18nRuntime(["en-US", "ko-KR"]);
    runtime.setLanguage("ko-KR");
    const koreanHtml = renderLoadingShell(runtime.t);

    expect(koreanHtml).toContain("<h1>불러오는 중</h1>");
    expect(koreanHtml).not.toContain("<h1>common.loading</h1>");
  });
});
