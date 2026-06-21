import * as React from "react";
import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createLegacyI18nRuntime } from "./i18n";
import { testRuntimeConfig } from "./auth-workspace-shell.test-helpers";
import { OrganizationDetailPage, OrganizationSettingsPage } from "./routes/-organization-views";
import type { OrganizationDetailViewModel } from "./routes/-view-models";

type LegacyMessageLookup = ReturnType<typeof createLegacyI18nRuntime>["t"];

const organizationDetail: OrganizationDetailViewModel = {
  adminMembers: [],
  description: "Organization overview",
  enrollmentRequested: false,
  memberMembers: [],
  organizationName: "yona-org",
  viewerCanCreateProject: true,
  viewerCanEnroll: true,
  viewerCanLeave: false,
  viewerCanUpdate: true,
  visibleProjects: [],
};

function renderOrganizationHome(messages?: LegacyMessageLookup) {
  return renderToStaticMarkup(
    <OrganizationDetailPage
      detail={organizationDetail}
      messages={messages}
      runtimeConfig={testRuntimeConfig}
    />,
  );
}

function renderOrganizationSettings(messages?: LegacyMessageLookup) {
  return renderToStaticMarkup(
    <OrganizationSettingsPage
      detail={organizationDetail}
      messages={messages}
      runtimeConfig={testRuntimeConfig}
    />,
  );
}

describe("organization shell legacy i18n opt-in", () => {
  it("keeps organization menu/header fallback keys without a runtime provider", () => {
    const homeHtml = renderOrganizationHome();
    const settingsHtml = renderOrganizationSettings();

    expect(homeHtml).toContain(">title.organizationHome<");
    expect(homeHtml).toContain(">menu.issue<");
    expect(homeHtml).toContain(">menu.board<");
    expect(homeHtml).toContain(">menu.pullRequest<");
    expect(homeHtml).toContain(" organization.member.enrollment.title</button>");
    expect(homeHtml).toContain(">organization.you.may.want.to.be.a.member yona-org<");
    expect(homeHtml).toContain(">organization.member.enrollment.help.before<");
    expect(homeHtml).toContain(" button.new.enrollment</a>");
    expect(settingsHtml).toContain(">organization.settingFrom<");
    expect(settingsHtml).toContain(">organization.member<");
    expect(settingsHtml).toContain(">organization.delete<");
  });

  it("uses default English legacy messages for organization shell labels", () => {
    const runtime = createLegacyI18nRuntime(["en-US", "ko-KR"]);
    const homeHtml = renderOrganizationHome(runtime.t);
    const settingsHtml = renderOrganizationSettings(runtime.t);

    expect(homeHtml).toContain(">Group Home<");
    expect(homeHtml).toContain(">Issue<");
    expect(homeHtml).toContain(">Board<");
    expect(homeHtml).toContain(">Pull request<");
    expect(homeHtml).toContain(" Member enrollment request</button>");
    expect(homeHtml).toContain(">You may want to be a member of yona-org group.<");
    expect(homeHtml).toContain(">Admins of this group can check your enrollment request.<");
    expect(homeHtml).toContain(" Send sign-up request</a>");
    expect(settingsHtml).toContain(">Setting<");
    expect(settingsHtml).toContain(">Group member<");
    expect(settingsHtml).toContain(">Group Delete<");
    expect(homeHtml).not.toContain(">title.organizationHome<");
  });

  it("switches organization shell labels to Korean legacy messages", () => {
    const runtime = createLegacyI18nRuntime(["en-US", "ko-KR"]);
    runtime.setLanguage("ko-KR");
    const homeHtml = renderOrganizationHome(runtime.t);
    const settingsHtml = renderOrganizationSettings(runtime.t);

    expect(homeHtml).toContain(">홈<");
    expect(homeHtml).toContain(">이슈<");
    expect(homeHtml).toContain(">게시판<");
    expect(homeHtml).toContain(">코드 주고받기<");
    expect(homeHtml).toContain(" 멤버등록요청</button>");
    expect(homeHtml).toContain(">yona-org 그룹 멤버로 등록 요청을 할 수 있습니다.<");
    expect(homeHtml).toContain(
      ">그룹에 멤버 등록 요청을 보내면 그룹 관리자가 확인 할 수 있습니다.<",
    );
    expect(homeHtml).toContain(" 멤버 등록 요청하기</a>");
    expect(settingsHtml).toContain(">설정<");
    expect(settingsHtml).toContain(">그룹 멤버<");
    expect(settingsHtml).toContain(">그룹 삭제<");
    expect(homeHtml).not.toContain(">Group Home<");
  });

  it("passes AppRuntimeContext message lookup into organization pull-request route shells", () => {
    const routeFiles = [
      "routes/organizations/$organizationName/route.tsx",
      "routes/organizations/$organizationName/issues/route.tsx",
      "routes/organizations/$organizationName/boards/route.tsx",
      "routes/organizations/$organizationName/pullrequests/route.tsx",
      "routes/organizations/$organizationName/closedPullrequests/route.tsx",
      "routes/organizations/$organizationName/settingform/route.tsx",
      "routes/organizations/$organizationName/members/route.tsx",
      "routes/organizations/$organizationName/deleteForm/route.tsx",
      "routes/-search-views.tsx",
    ];

    for (const routeFile of routeFiles) {
      const source = fs.readFileSync(path.resolve(__dirname, routeFile), "utf8");
      expect(source).toContain("messages");
      expect(source).toContain("messages={messages}");
    }
  });
});
