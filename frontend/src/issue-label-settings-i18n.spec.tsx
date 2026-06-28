import * as React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createLegacyI18nRuntime } from "./i18n";
import { testRuntimeConfig } from "./auth-workspace-shell.test-helpers";
import { IssueLabelsFormPage } from "./routes/$owner/$projectName/issue/labelsform/route";
import type { ProjectDetailViewModel } from "./routes/-view-models";

type LegacyMessageLookup = ReturnType<typeof createLegacyI18nRuntime>["t"];

const detail: ProjectDetailViewModel = {
  enrollmentRequested: false,
  isFavorited: false,
  organizationName: "",
  overview: "",
  ownerName: "yobi",
  projectName: "yona",
  projectScope: "public",
  viewerCanEnroll: false,
  viewerCanUpdate: true,
};

function renderIssueLabelSettings(messages?: LegacyMessageLookup, renderShell = true) {
  return renderToStaticMarkup(
    <IssueLabelsFormPage
      categories={[{ id: 10, isExclusive: true, name: "Priority" }]}
      csrfToken="csrf"
      detail={detail}
      labels={[
        {
          categoryId: 10,
          categoryIsExclusive: true,
          categoryName: "Priority",
          color: "#f44336",
          id: 100,
          name: "High",
        },
      ]}
      messages={messages}
      onChanged={() => Promise.resolve()}
      owner="yobi"
      projectName="yona"
      renderShell={renderShell}
      runtimeConfig={testRuntimeConfig}
    />,
  );
}

describe("project issue label settings legacy i18n opt-in", () => {
  it("keeps label form validation fallbacks in structured legacy keys", () => {
    const source = readFileSync(
      new URL("./routes/$owner/$projectName/issue/labelsform/route.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain('key: "label.failedTo"');
    expect(source).toContain('key: "label.error.empty"');
    expect(source).toContain('key: "label.error.color"');
    expect(source).not.toContain("label.failedTo label.add");
    expect(source).not.toContain("error.failedTo");
  });

  it("resolves legacy label controls without AppRuntimeContext messages", () => {
    const legacyIssueLabelsListTemplate = readFileSync(
      new URL(
        "../../yona-original/app/views/project/partial_issuelabels_list.scala.html",
        import.meta.url,
      ),
      "utf8",
    );
    const html = renderIssueLabelSettings();

    expect(html).toContain(
      ">Copy all labels from a project and append to current project</strong>",
    );
    expect(html).toContain('placeholder="Owner Name"');
    expect(html).toContain('placeholder="Project name"');
    expect(html).toContain(">Copy labels</button>");
    expect(html).toContain(
      ">If project path is &#x27;naver/yobi&#x27;, then owner name is &#x27;naver&#x27; and project name is &#x27;yobi&#x27;. Character case is ignored.</div>",
    );
    expect(html).toContain(">Add new label</strong>");
    expect(html).toContain('placeholder="Category"');
    expect(html).toContain('placeholder="Name"');
    expect(html).toContain('placeholder="Label Color"');
    expect(html).toContain(">Add label</button>");
    expect(html).toContain(">Category</strong>");
    expect(html).toContain(">Name</strong>");
    expect(html).toContain("In this category, you can choose&lt;br&gt;only a single label");
    expect(legacyIssueLabelsListTemplate).toContain('data-category="@category.id"');
    expect(legacyIssueLabelsListTemplate).toContain('data-label-id="@label.id"');
    expect(html).toContain('data-category="10"');
    expect(html).toContain('data-category-id="10"');
    expect(html).toContain('data-label-id="100"');
    expect(html).toContain('data-label-name="High"');
    expect(html).toContain(">Delete</button>");
    expect(html).toContain(">Edit</button>");
    expect(html).not.toContain(">label.copy</button>");
    expect(html).not.toContain('placeholder="project.owner"');
    expect(html).not.toContain(">button.delete</button>");
  });

  it("uses Korean legacy messages for label and category settings controls", () => {
    const runtime = createLegacyI18nRuntime(["en-US", "ko-KR"]);
    runtime.setLanguage("ko-KR");
    const html = renderIssueLabelSettings(runtime.t);

    expect(html).toContain(
      ">특정 프로젝트의 라벨을 통째로 복사해서 현재 프로젝트에 추가합니다.</strong>",
    );
    expect(html).toContain('placeholder="프로젝트 소유자"');
    expect(html).toContain('placeholder="프로젝트 이름"');
    expect(html).toContain(">라벨 복사</button>");
    expect(html).toContain(">새 라벨 추가</strong>");
    expect(html).toContain('placeholder="분류"');
    expect(html).toContain('placeholder="이름"');
    expect(html).toContain('placeholder="라벨 색"');
    expect(html).toContain(">라벨 추가</button>");
    expect(html).toContain(">분류</strong>");
    expect(html).toContain(">이름</strong>");
    expect(html).toContain("이 분류의 라벨은:&lt;br&gt;하나만 선택할 수 있습니다");
    expect(html).toContain(">삭제</button>");
    expect(html).toContain(">수정</button>");
    expect(html).not.toContain(">label.copy</button>");
    expect(html).not.toContain(">label.add</button>");
    expect(html).not.toContain(">button.delete</button>");
  });

  it("lets the project layout route own the issue label settings shell", () => {
    const html = renderIssueLabelSettings(undefined, false);
    const layoutSource = readFileSync(
      new URL("./routes/$owner/$projectName/route.tsx", import.meta.url),
      "utf8",
    );
    const routeSource = readFileSync(
      new URL("./routes/$owner/$projectName/issue/labelsform/route.tsx", import.meta.url),
      "utf8",
    );

    expect(layoutSource).toContain("appPath === `/${owner}/${projectName}/issue/labelsform`");
    expect(layoutSource).toContain('return { activeMenu: "settings" };');
    expect(routeSource).toContain("renderShell={false}");
    expect(routeSource).not.toContain("ProjectHeader");
    expect(routeSource).not.toContain("ProjectMenu");
    expect(routeSource).not.toContain('className="page-wrap-outer"');
    expect(html).not.toContain('class="page-wrap-outer"');
    expect(html).not.toContain('class="project-header-outer"');
    expect(html).not.toContain('class="project-menu-outer"');
    expect(html).toContain('class="project-page-wrap label-editor-wrap"');
    expect(html).toContain('id="subMenuIssueLabel"');
    expect(html).toContain('id="labelsList"');
    expect(html).toContain('id="editLabel"');
  });
});
