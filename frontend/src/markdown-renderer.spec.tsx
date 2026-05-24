import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MarkdownRenderer } from "./routes/-markdown-renderer";

describe("MarkdownRenderer", () => {
  it("renders legacy preview autolinks on the React side", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        basePath="/yona"
        issueReferences={[
          {
            issueNumber: 1,
            ownerName: "owner",
            projectName: "projectYobi",
            state: "open",
            title: "Markdown preview target",
          },
        ]}
        markdown="Hello @owner #1 owner/projectYobi#1 ftp://files.example.com www.example.com help@example.com"
        ownerName="owner"
        projectName="projectYobi"
      />,
    );

    expect(html).toContain('href="/yona/owner"');
    expect(html).toContain('class="no-text-decoration user-link"');
    expect(html).toContain('href="/yona/owner/projectYobi/issue/1"');
    expect(html).toContain('class="issueLink"');
    expect(html).toContain('title="Markdown preview target"');
    expect(html).toContain('data-issue-state="open"');
    expect(html).toContain('href="ftp://files.example.com"');
    expect(html).toContain('href="http://www.example.com"');
    expect(html).toContain('href="mailto:help@example.com"');
  });
});
