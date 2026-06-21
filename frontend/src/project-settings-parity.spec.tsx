import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createLegacyI18nRuntime } from "./i18n";
import {
  ProjectChangeVcsPage,
  ProjectDeletePage,
  ProjectMembersPage,
  ProjectSettingsPage,
  ProjectTransferPage,
  ProjectWebhooksPage,
} from "./routes/-project-views";

const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };

const projectDetail = {
  boardCount: 0,
  codeMemberOnly: true,
  defaultReviewerCount: 2,
  enrollmentRequested: false,
  isFavorited: false,
  isUsingReviewerCount: true,
  maxReviewerCount: 3,
  organizationName: "",
  overview: "Overview",
  ownerName: "admin",
  projectName: "projectYobi",
  projectScope: "protected",
  showBoard: false,
  showCode: true,
  showIssue: false,
  showMilestone: true,
  showPullRequest: true,
  showReview: false,
  viewerCanEnroll: false,
  viewerCanUpdate: true,
};

describe("project settings parity", () => {
  it("renders the legacy project setting form shell and controls", () => {
    const html = renderToStaticMarkup(
      <ProjectSettingsPage detail={projectDetail} runtimeConfig={runtimeConfig} />,
    );

    expect(html).toContain('class="page-wrap-outer"');
    expect(html).toContain('class="project-header-outer"');
    expect(html).toContain('class="project-header-inner"');
    expect(html).toContain('class="project-header-wrap"');
    expect(html).toContain('<a href="/yona/admin">admin</a>');
    expect(html).toContain('<a href="/yona/admin/projectYobi">projectYobi</a>');
    expect(html).toContain('class="project-menu-outer"');
    expect(html).toContain(
      '<li class="active"><a href="/yona/admin/projectYobi/settingform"><i class="yobicon-cog"></i>',
    );
    expect(html).toContain('class="project-page-wrap"');
    expect(html).toContain('id="saveSetting"');
    expect(html).toContain('class="bubble-wrap gray"');
    expect(html).toContain('class="box-wrap top clearfix frm-wrap"');
    expect(html).toContain('class="setting-box left"');
    expect(html).toContain('class="setting-box right"');
    expect(html).toContain('id="project-name"');
    expect(html).toContain('name="name"');
    expect(html).toContain('id="project-desc"');
    expect(html).toContain('name="overview"');
    expect(html).toContain('id="protected"');
    expect(html).toContain('checked="" value="PROTECTED"');
    expect(html).not.toContain('<select name="projectScope">');
    expect(html).toContain('id="codeAccessibleMemberOnly"');
    expect(html).toContain('checked="" value="true"');
    expect(html).toContain('id="reviewerCountSettingPanel"');
    expect(html).toContain('id="menuSettingCode"');
    expect(html).toContain('id="menuSettingPullRequest"');
    expect(html).toContain('id="save"');
  });

  it("keeps literal legacy keys without AppRuntimeContext messages", () => {
    const settingsHtml = renderToStaticMarkup(
      <ProjectSettingsPage detail={projectDetail} runtimeConfig={runtimeConfig} />,
    );
    const membersHtml = renderToStaticMarkup(
      <ProjectMembersPage
        detail={{
          enrollmentRequests: [],
          members: [],
          ownerName: "admin",
          projectName: "projectYobi",
          roleOptions: [],
          viewerCanUpdate: true,
        }}
        runtimeConfig={runtimeConfig}
      />,
    );
    const webhooksHtml = renderToStaticMarkup(
      <ProjectWebhooksPage
        detail={{
          deliveries: [],
          ownerName: "admin",
          projectName: "projectYobi",
          viewerCanUpdate: true,
          webhookTypes: ["SIMPLE"],
          webhooks: [],
        }}
        projectDetail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );
    const transferHtml = renderToStaticMarkup(
      <ProjectTransferPage
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
        transfer={{
          acceptPath: "",
          ownerName: "admin",
          projectName: "projectYobi",
          viewerCanTransfer: true,
        }}
      />,
    );
    const deleteHtml = renderToStaticMarkup(
      <ProjectDeletePage detail={projectDetail} runtimeConfig={runtimeConfig} />,
    );
    const changeVcsHtml = renderToStaticMarkup(
      <ProjectChangeVcsPage
        changeVcs={{
          currentVcs: "GIT",
          nextVcs: "Subversion",
          ownerName: "admin",
          projectName: "projectYobi",
          viewerCanChange: true,
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(settingsHtml).toContain(">project.setting</a>");
    expect(settingsHtml).toContain(">button.save</button>");
    expect(membersHtml).toContain('placeholder="project.members.addMember"');
    expect(webhooksHtml).toContain(">project.webhook.new</strong>");
    expect(transferHtml).toContain(">project.transfer.new.owner</div>");
    expect(deleteHtml).toContain(">project.delete.description</strong>");
    expect(changeVcsHtml).toContain(">project.changeVCS.description1 Subversion</strong>");
  });

  it("uses Korean legacy messages for project settings controls when lookup is provided", () => {
    const runtime = createLegacyI18nRuntime(["en-US", "ko-KR"]);
    runtime.setLanguage("ko-KR");
    const settingsHtml = renderToStaticMarkup(
      <ProjectSettingsPage
        detail={projectDetail}
        messages={runtime.t}
        runtimeConfig={runtimeConfig}
      />,
    );
    const membersHtml = renderToStaticMarkup(
      <ProjectMembersPage
        detail={{
          enrollmentRequests: [{ avatarUrl: "", loginId: "guest", userId: 3, userLabel: "Guest" }],
          members: [],
          ownerName: "admin",
          projectName: "projectYobi",
          roleOptions: [],
          viewerCanUpdate: true,
        }}
        messages={runtime.t}
        runtimeConfig={runtimeConfig}
      />,
    );
    const webhooksHtml = renderToStaticMarkup(
      <ProjectWebhooksPage
        detail={{
          deliveries: [],
          ownerName: "admin",
          projectName: "projectYobi",
          viewerCanUpdate: true,
          webhookTypes: ["SIMPLE"],
          webhooks: [],
        }}
        messages={runtime.t}
        projectDetail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );
    const transferHtml = renderToStaticMarkup(
      <ProjectTransferPage
        detail={projectDetail}
        messages={runtime.t}
        runtimeConfig={runtimeConfig}
        transfer={{
          acceptPath: "",
          ownerName: "admin",
          projectName: "projectYobi",
          viewerCanTransfer: true,
        }}
      />,
    );
    const deleteHtml = renderToStaticMarkup(
      <ProjectDeletePage
        detail={projectDetail}
        messages={runtime.t}
        runtimeConfig={runtimeConfig}
      />,
    );
    const changeVcsHtml = renderToStaticMarkup(
      <ProjectChangeVcsPage
        changeVcs={{
          currentVcs: "GIT",
          nextVcs: "Subversion",
          ownerName: "admin",
          projectName: "projectYobi",
          viewerCanChange: true,
        }}
        detail={projectDetail}
        messages={runtime.t}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(settingsHtml).toContain(">설정</a>");
    expect(settingsHtml).toContain(">메뉴 설정</div>");
    expect(settingsHtml).toContain(">저장</button>");
    expect(membersHtml).toContain('placeholder="새로운 멤버의 아이디를 입력하세요"');
    expect(membersHtml).toContain(">멤버 등록 요청 (1)</h3>");
    expect(webhooksHtml).toContain(">새 웹후크 생성</strong>");
    expect(webhooksHtml).toContain('placeholder="전송할 주소"');
    expect(webhooksHtml).toContain(">웹후크 추가</button>");
    expect(transferHtml).toContain(">이관받을 사용자 또는 그룹</div>");
    expect(transferHtml).toContain("프로젝트를 이관합니다.</a>");
    expect(deleteHtml).toContain(
      ">프로젝트를 삭제하게되면 코드, 게시판, 이슈 등 모든 데이터가 삭제되며",
    );
    expect(changeVcsHtml).toContain(">코드 저장소 타입을 Subversion으로 변경합니다.</strong>");
    expect(changeVcsHtml).not.toContain(">project.changeVCS.description1 Subversion</strong>");
  });
});
