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

function renderIssueLabelSettings(messages?: LegacyMessageLookup) {
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

  it("keeps legacy key fallbacks when rendered without AppRuntimeContext messages", () => {
    const html = renderIssueLabelSettings();

    expect(html).toContain(">label.copy.append</strong>");
    expect(html).toContain('placeholder="project.owner"');
    expect(html).toContain('placeholder="project.name"');
    expect(html).toContain(">label.copy</button>");
    expect(html).toContain(">label.copy.description</div>");
    expect(html).toContain(">label.new</strong>");
    expect(html).toContain('placeholder="label.category"');
    expect(html).toContain('placeholder="label.name"');
    expect(html).toContain('placeholder="label.customColor"');
    expect(html).toContain(">label.add</button>");
    expect(html).toContain(">label.category</strong>");
    expect(html).toContain(">label.name</strong>");
    expect(html).toContain("label.category.option&lt;br&gt;label.category.option.single");
    expect(html).toContain(">button.delete</button>");
    expect(html).toContain(">button.edit</button>");
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
});
