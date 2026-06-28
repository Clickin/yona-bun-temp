import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createLegacyI18nRuntime } from "./i18n";
import { HelpTocPage, LegacyExperimentalHelp } from "./routes/-help-views";

describe("legacy help route parity", () => {
  it("keeps the anonymous legacy /_help route mounted in React", () => {
    const legacyRoutes = fs.readFileSync(
      path.resolve(__dirname, "../../yona-original/conf/routes"),
      {
        encoding: "utf8",
      },
    );
    const legacyController = fs.readFileSync(
      path.resolve(__dirname, "../../yona-original/app/controllers/HelpApp.java"),
      { encoding: "utf8" },
    );
    const routeSource = fs.readFileSync(path.resolve(__dirname, "routes/[_]help/route.tsx"), {
      encoding: "utf8",
    });

    expect(legacyRoutes).toContain("GET            /_help");
    expect(legacyController).toContain("@AnonymousCheck");
    expect(routeSource).toContain('createFileRoute("/_help")');
    expect(routeSource).not.toContain("useRequireAuthenticatedRoute");
  });

  it("keeps the legacy FAQ item-wide toggle target", () => {
    const legacyView = fs.readFileSync(
      path.resolve(__dirname, "../../yona-original/app/views/help/toc.scala.html"),
      { encoding: "utf8" },
    );
    const helpViewSource = fs.readFileSync(path.resolve(__dirname, "routes/-help-views.tsx"), {
      encoding: "utf8",
    });

    expect(legacyView).toContain('$(".qas > .qa").click');
    expect(helpViewSource).toContain('querySelectorAll<HTMLLIElement>(":scope > .qa")');
    expect(helpViewSource).toContain('item.addEventListener("click", listener)');
    expect(helpViewSource).toContain('className={`qa${openItems.has(index) ? " open" : ""}`}');
  });

  it("renders the legacy help/toc FAQ shell and anchors", () => {
    const legacyView = fs.readFileSync(
      path.resolve(__dirname, "../../yona-original/app/views/help/toc.scala.html"),
      { encoding: "utf8" },
    );
    const html = renderToStaticMarkup(<HelpTocPage />);

    expect(html).toContain('class="site-breadcrumb-outer"');
    expect(html).toContain('class="site-breadcrumb-inner"');
    expect(html).toContain("<h3>Help</h3>");
    expect(html).not.toContain("<h3>title.help</h3>");
    expect(html).toContain('class="page-wrap-outer"');
    expect(html).toContain('class="page-wrap"');
    expect(html).toContain('class="qas"');
    expect(html).toContain('class="qa"');
    expect(html).toContain('class="question-wrap"');
    expect(html).toContain('class="yobicon-q q"');
    expect(html).toContain('href="#!/toggle"');
    expect(html).toContain('class="answer-wrap"');
    expect(html).toContain('class="yobicon-a a"');
    expect(html).toContain('style="width:100%"');
    expect(legacyView).toContain('@Messages("app.name")를 설치하고 싶어요.');
    expect(html).toContain("Yona를 설치하고 싶어요.");
    expect(html).not.toContain("app.name");
    expect(html).toContain("프로젝트를 새로 생성하고 싶어요.");
    expect(html).toContain("게시판에서는 어떠한 것들을 할수 있나요?");
    expect(html).toContain("https://github.com/doortts/yona#korean");
    expect(html).toContain("https://github.com/nforge/yobi/issues");
  });

  it("renders the orphaned legacy experimental help modal shell", () => {
    const legacyView = fs.readFileSync(
      path.resolve(__dirname, "../../yona-original/app/views/help/experimental.scala.html"),
      { encoding: "utf8" },
    );
    const html = renderToStaticMarkup(<LegacyExperimentalHelp />);

    expect(legacyView).toContain('id="experimentalHelp"');
    expect(legacyView).toContain('class="modal hide fade"');
    expect(legacyView).toContain('class="yobicon-flaskfull mr10 vmiddle"');
    expect(legacyView).toContain('@Messages("common.experimental.title")');
    expect(legacyView).toContain('@Html(Messages("common.experimental.description"))');
    expect(html).toContain('id="experimentalHelp"');
    expect(html).toContain('class="modal hide fade"');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain('class="modal-body"');
    expect(html).toContain('class="yobicon-flaskfull mr10 vmiddle"');
    expect(html).toContain("Experimental function: A new feature is on the way..");
    expect(html).toContain("Work on this function is underway;");
    expect(html).toContain("<br/>");
    expect(html).toContain('class="actrow center-txt"');
    expect(html).toContain('data-dismiss="modal"');
    expect(html).toContain(">Confirm</button>");
  });

  it("renders the experimental help modal inside the legacy /_help route shell", () => {
    const html = renderToStaticMarkup(<HelpTocPage />);

    expect(html).toContain('id="experimentalHelp"');
    expect(html).toContain('class="modal hide fade"');
    expect(html).toContain("Experimental function: A new feature is on the way..");
  });

  it("renders legacy app.name FAQ copy from the runtime site name", () => {
    const html = renderToStaticMarkup(<HelpTocPage siteName="Legacy Yona" />);

    expect(html).toContain("Legacy Yona를 설치하고 싶어요.");
    expect(html).toContain("Legacy Yona를 설치하고자 하면");
    expect(html).toContain("Legacy Yona의 버그를 발견했어요.");
    expect(html).toContain("Legacy Yona 이슈트래커에 등록");
    expect(html).not.toContain("app.name");
  });

  it("opts the legacy help title into runtime message lookup", () => {
    const runtime = createLegacyI18nRuntime(["en-US", "ko-KR"], ["ko-KR"]);
    const html = renderToStaticMarkup(<HelpTocPage messages={runtime.t} />);

    expect(html).toContain("<h3>도움말</h3>");
    expect(html).not.toContain("<h3>title.help</h3>");
  });
});
