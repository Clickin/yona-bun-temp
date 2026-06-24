import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MigrationDisabledPage } from "./routes/migration/route";

describe("legacy migration disabled route parity", () => {
  it("renders the legacy disabled migration shell from React", () => {
    const html = renderToStaticMarkup(
      <MigrationDisabledPage runtimeConfig={{ apiBaseUrl: "/yona/api", basePath: "/yona" }} />,
    );

    expect(html).toContain("yobi-migration");
    expect(html).toContain("Yona to Github");
    expect(html).toContain("Source 프로젝트를 선택해 주세요");
    expect(html).toContain("Destination 프로젝트를 선택해 주세요");
    expect(html).toContain("Migration 대상");
    expect(html).toContain("마일스톤 옮기기");
    expect(html).toContain("이슈 옮기기");
    expect(html).toContain("게시글 옮기기");
    expect(html).toContain('href="/yona/sites/data"');
    expect(html).toContain("error.forbidden.or.not.allowed");
  });
});
