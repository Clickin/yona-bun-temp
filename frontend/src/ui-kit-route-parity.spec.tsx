import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { UIKitPage } from "./routes/-ui-kit-views";

describe("legacy UIKit route parity", () => {
  it("keeps the legacy /_UIKit route mounted in React", () => {
    const legacyRoutes = fs.readFileSync(path.resolve(__dirname, "../../yona-original/conf/routes"), {
      encoding: "utf8",
    });
    const legacyController = fs.readFileSync(
      path.resolve(__dirname, "../../yona-original/app/controllers/Application.java"),
      { encoding: "utf8" },
    );
    const routeSource = fs.readFileSync(path.resolve(__dirname, "routes/[_]UIKit/route.tsx"), {
      encoding: "utf8",
    });

    expect(legacyRoutes).toContain("GET            /_UIKit");
    expect(legacyController).toContain("public static Result UIKit()");
    expect(legacyController).toContain("views.html.help.UIKit.render()");
    expect(routeSource).toContain('createFileRoute("/_UIKit")');
    expect(routeSource).not.toContain("useRequireAuthenticatedRoute");
  });

  it("renders the legacy UIKit sample sections and class names", () => {
    const html = renderToStaticMarkup(<UIKitPage />);

    expect(html).toContain('class="gnb-outer"');
    expect(html).toContain('class="subtitle">Yobi UI</span>');
    expect(html).toContain("<h3>Buttons</h3>");
    expect(html).toContain('class="ybtn ybtn-primary"');
    expect(html).toContain('class="nbtn medium white fake-file-wrap"');
    expect(html).toContain("<h3>Select</h3>");
    expect(html).toContain('class="btn dropdown-toggle small"');
    expect(html).toContain('class="btn dropdown-toggle medium"');
    expect(html).toContain('class="btn dropdown-toggle large"');
    expect(html).toContain("담당자 없음");
    expect(html).toContain("<h3>Search Form</h3>");
    expect(html).toContain('placeholder="현재 프로젝트에서 검색"');
    expect(html).toContain('class="search-btn"');
    expect(html).toContain("<h3>Labels</h3>");
    expect(html).toContain('class="issue-label active editable"');
    expect(html).toContain("<h3>Avatar</h3>");
    expect(html).toContain('class="avatar-wrap xlarge"');
    expect(html).toContain("/assets/images/default-avatar-128.png");
    expect(html).toContain("<h3>Tabs</h3>");
    expect(html).toContain('class="nav nav-tabs"');
    expect(html).toContain("파일");
    expect(html).toContain("커밋");
    expect(html).toContain("<h3>Switches</h3>");
    expect(html).toContain('data-on-label="미해결"');
    expect(html).toContain('data-off-label="해결"');
    expect(html).toContain("NAVER Corp.");
  });
});
