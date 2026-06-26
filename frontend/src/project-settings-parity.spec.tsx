import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createLegacyI18nRuntime } from "./i18n";
import {
  ProjectChangeVcsPage,
  ProjectDeletePage,
  ProjectForkPage,
  ProjectHeader,
  ProjectMembersPage,
  ProjectSettingsPage,
  ProjectTransferPage,
  ProjectWebhooksPage,
  ProjectWatchersPage,
} from "./routes/-project-views";

const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };

const projectDetail = {
  boardCount: 0,
  codeMemberOnly: true,
  defaultReviewerCount: 2,
  enrollmentRequestCount: 2,
  enrollmentRequested: false,
  isFavorited: false,
  isUsingReviewerCount: true,
  logoUrl: "/yona/files/project-logo.png",
  maxReviewerCount: 3,
  organizationName: "team",
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
  vcs: "GIT",
};

describe("project settings parity", () => {
  it("opts project and organization settings loading shells into legacy messages", () => {
    const routePaths = [
      "routes/$owner/$projectName/settingform/route.tsx",
      "routes/$owner/$projectName/members/route.tsx",
      "routes/$owner/$projectName/webhooks/route.tsx",
      "routes/$owner/$projectName/transfer/route.tsx",
      "routes/$owner/$projectName/changeVCS/route.tsx",
      "routes/$owner/$projectName/statistics/route.tsx",
      "routes/$owner/$projectName/deleteform/route.tsx",
      "routes/organizations/$organizationName/settingform/route.tsx",
      "routes/organizations/$organizationName/members/route.tsx",
      "routes/organizations/$organizationName/deleteForm/route.tsx",
      "routes/organizations/$organizationName/issues/route.tsx",
    ];

    for (const routePath of routePaths) {
      const source = fs.readFileSync(path.resolve(__dirname, routePath), "utf8");

      expect(source).toContain('messages("common.loading", { fallback: "common.loading" })');
      expect(source).not.toContain("<h1>common.loading</h1>");
    }
  });

  it("looks up project settings mutation fallback keys through the runtime messages", () => {
    const routeFiles = [
      ["routes/$owner/$projectName/settingform/route.tsx", "error.badrequest"],
      ["routes/$owner/$projectName/webhooks/route.tsx", "error.badrequest"],
      ["routes/$owner/$projectName/deleteform/route.tsx", "project.delete.error"],
      ["routes/$owner/$projectName/transfer/route.tsx", "project.transfer.error"],
      ["routes/$owner/$projectName/changeVCS/route.tsx", "project.changeVCS.error"],
      ["routes/$owner/$projectName/newFork/route.tsx", "fork.failed"],
    ];

    for (const [routeFile, key] of routeFiles) {
      const source = fs.readFileSync(path.resolve(__dirname, routeFile), "utf8");
      expect(source).toContain(`messages("${key}", { fallback: "${key}" })`);
    }
  });

  it("renders the legacy project setting form shell and controls", () => {
    const html = renderToStaticMarkup(
      <ProjectSettingsPage
        defaultBranch="main"
        defaultBranchOptions={[{ name: "main" }, { name: "feature/settings" }]}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );
    const viewSource = fs.readFileSync(
      path.resolve(__dirname, "routes/-project-views.tsx"),
      "utf8",
    );
    const routeSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/settingform/route.tsx"),
      "utf8",
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
    expect(html).toContain('<span class="project-menu-count">2</span>');
    expect(html).toContain('class="project-page-wrap"');
    expect(html).toContain('id="saveSetting"');
    expect(html).toContain(
      'id="subMenuProjectMember"><a href="/yona/admin/projectYobi/members">Member<span class="num-badge">2</span></a>',
    );
    expect(html).not.toContain('action="/yona/admin/projectYobi/setting"');
    expect(html).not.toContain('method="post"');
    expect(html).toContain('class="bubble-wrap gray"');
    expect(html).toContain('class="box-wrap top clearfix frm-wrap"');
    expect(html).toContain('class="setting-box left"');
    expect(html).toContain('class="logo-wrap"');
    expect(html).toContain(
      'style="background-image:url(&#x27;/yona/files/project-logo.png&#x27;)"',
    );
    expect(html).toContain('id="logoPath"');
    expect(html).toContain('class="setting-box right"');
    expect(html).toContain('id="project-name"');
    expect(html).toContain('name="name"');
    expect(html).toContain('id="project-desc"');
    expect(html).toContain('name="overview"');
    expect(html).toContain('id="protected"');
    expect(html).toContain('checked="" value="PROTECTED"');
    expect(html).not.toContain('<select name="projectScope">');
    expect(html).toContain(">Issue Template</div>");
    expect(html).toContain('href="/yona/admin/projectYobi/postform?issueTemplate=true"');
    expect(html).toContain(">Edit</a>");
    expect(html).toContain('id="codeAccessibleMemberOnly"');
    expect(html).toContain('checked="" value="true"');
    expect(html).not.toContain(
      'id="codeAccessibleMemberOnly" name="isCodeAccessibleMemberOnly" readOnly',
    );
    expect(html).toContain('id="reviewerCountSettingPanel"');
    expect(html).toContain('id="defaultBranceSettingPanel"');
    expect(html).toContain('id="project-default-branch"');
    expect(html).toContain('name="defaultBranch"');
    expect(html).toContain('data-toggle="select2"');
    expect(html).toContain('data-format="branch"');
    expect(html).toContain('<option value="main" selected="">main</option>');
    expect(html).toContain('<option value="feature/settings">feature/settings</option>');
    expect(html).toContain('id="welReviewerCount"');
    expect(html).toContain('data-id="project-reviewer-count"');
    expect(html).toContain('data-name="defaultReviewerCount"');
    expect(html).toContain('class="btn dropdown-toggle large"');
    expect(html).toContain('data-toggle="dropdown"');
    expect(html).toContain('class="d-label">2</span>');
    expect(html).toContain('class="d-caret"><span class="caret"></span></span>');
    expect(html).toContain('class="dropdown-menu"');
    expect(html).toContain('<li data-value="1"><a href="#reviewer-count">1</a></li>');
    expect(html).toContain('<li data-value="2"><a href="#reviewer-count">2</a></li>');
    expect(html).not.toContain('<select id="project-reviewer-count"');
    expect(html).not.toContain('<select name="defaultReviewerCount"');
    expect(html).toContain('id="menuSettingCode"');
    expect(html).toContain('id="menuSettingPullRequest"');
    expect(html).toContain('id="save"');
    expect(viewSource).not.toContain("action={buildProjectHref(");
    expect(viewSource).toContain("event.preventDefault();");
    expect(viewSource).not.toContain("if (!props.onUpdateProjectSettings) {");
    expect(viewSource).toContain("props.onUpdateProjectSettings?.({");
    expect(routeSource).toContain("readCodeBranches");
    expect(routeSource).toContain("setDefaultCodeBranchRest");
    expect(routeSource).toContain("input.defaultBranch !== branchList.defaultBranch");
  });

  it("lets the project layout route own the settings shell without changing the inner body", () => {
    const html = renderToStaticMarkup(
      <ProjectSettingsPage
        defaultBranch="main"
        defaultBranchOptions={[{ name: "main" }]}
        detail={projectDetail}
        renderShell={false}
        runtimeConfig={runtimeConfig}
      />,
    );
    const layoutSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/route.tsx"),
      "utf8",
    );
    const routeSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/settingform/route.tsx"),
      "utf8",
    );

    expect(layoutSource).toContain(
      "<ProjectHeader detail={detail} runtimeConfig={runtimeConfig} />",
    );
    expect(layoutSource).toContain('return { activeMenu: "settings" };');
    expect(layoutSource).toContain("activeMenu={activeMenu}");
    expect(layoutSource).toContain("runtimeConfig={runtimeConfig}");
    expect(routeSource).toContain("renderShell={false}");
    expect(html).not.toContain('class="page-wrap-outer"');
    expect(html).not.toContain('class="project-header-outer"');
    expect(html).toContain('class="project-page-wrap"');
    expect(html).toContain('id="saveSetting"');
  });

  it("lets the project layout route own the webhooks settings shell", () => {
    const html = renderToStaticMarkup(
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
        renderShell={false}
        runtimeConfig={runtimeConfig}
      />,
    );
    const layoutSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/route.tsx"),
      "utf8",
    );
    const routeSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/webhooks/route.tsx"),
      "utf8",
    );

    expect(layoutSource).toContain("appPath === `/${owner}/${projectName}/webhooks`");
    expect(layoutSource).toContain('return { activeMenu: "settings" };');
    expect(routeSource).toContain("renderShell={false}");
    expect(html).not.toContain('class="page-wrap-outer"');
    expect(html).not.toContain('class="project-header-outer"');
    expect(html).not.toContain('class="project-menu-outer"');
    expect(html).toContain('class="project-page-wrap webhook-editor-wrap"');
    expect(html).toContain('id="subMenuWebhook"');
    expect(html).toContain('id="formNewWebhook"');
    expect(html).toContain('id="webhooksList"');
  });

  it("lets the project layout route own the transfer settings shell", () => {
    const html = renderToStaticMarkup(
      <ProjectTransferPage
        detail={projectDetail}
        renderShell={false}
        runtimeConfig={runtimeConfig}
        transfer={{
          acceptPath: "",
          ownerName: "admin",
          projectName: "projectYobi",
          transferId: 0,
          viewerCanTransfer: true,
        }}
      />,
    );
    const layoutSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/route.tsx"),
      "utf8",
    );
    const routeSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/transfer/route.tsx"),
      "utf8",
    );

    expect(layoutSource).toContain("appPath === `/${owner}/${projectName}/transfer`");
    expect(layoutSource).toContain('return { activeMenu: "settings" };');
    expect(routeSource).toContain("renderShell={false}");
    expect(html).not.toContain('class="page-wrap-outer"');
    expect(html).not.toContain('class="project-header-outer"');
    expect(html).not.toContain('class="project-menu-outer"');
    expect(html).toContain('class="project-page-wrap"');
    expect(html).toContain('id="subMenuProjectTransfer"');
    expect(html).toContain('id="btnTransfer"');
    expect(html).toContain('id="alertTransfer"');
  });

  it("lets the project layout route own the delete settings shell", () => {
    const html = renderToStaticMarkup(
      <ProjectDeletePage
        detail={projectDetail}
        renderShell={false}
        runtimeConfig={runtimeConfig}
      />,
    );
    const layoutSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/route.tsx"),
      "utf8",
    );
    const routeSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/deleteform/route.tsx"),
      "utf8",
    );

    expect(layoutSource).toContain("appPath === `/${owner}/${projectName}/deleteform`");
    expect(layoutSource).toContain('return { activeMenu: "settings" };');
    expect(routeSource).toContain("renderShell={false}");
    expect(html).not.toContain('class="page-wrap-outer"');
    expect(html).not.toContain('class="project-header-outer"');
    expect(html).not.toContain('class="project-menu-outer"');
    expect(html).toContain('class="project-page-wrap"');
    expect(html).toContain('id="subMenuProjectDelete"');
    expect(html).toContain('id="btnDelete"');
    expect(html).toContain('id="alertDeletion"');
  });

  it("lets the project layout route own the change VCS settings shell", () => {
    const html = renderToStaticMarkup(
      <ProjectChangeVcsPage
        changeVcs={{
          currentVcs: "GIT",
          nextVcs: "Subversion",
          ownerName: "admin",
          projectName: "projectYobi",
          viewerCanChange: true,
        }}
        detail={projectDetail}
        renderShell={false}
        runtimeConfig={runtimeConfig}
      />,
    );
    const layoutSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/route.tsx"),
      "utf8",
    );
    const routeSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/changeVCS/route.tsx"),
      "utf8",
    );

    expect(layoutSource).toContain("appPath === `/${owner}/${projectName}/changeVCS`");
    expect(layoutSource).toContain('return { activeMenu: "settings" };');
    expect(routeSource).toContain("renderShell={false}");
    expect(html).not.toContain('class="page-wrap-outer"');
    expect(html).not.toContain('class="project-header-outer"');
    expect(html).not.toContain('class="project-menu-outer"');
    expect(html).toContain('class="project-page-wrap"');
    expect(html).toContain('id="subMenuProjectChangeVCS"');
    expect(html).toContain('id="btnChangeVCS"');
    expect(html).toContain('id="alertChangeVCS"');
  });

  it("lets the project layout route own the fork shell without changing the inner body", () => {
    const html = renderToStaticMarkup(
      <ProjectForkPage
        detail={projectDetail}
        forkOptions={{
          canFork: true,
          existingForks: [],
          ownerOptions: [{ organization: false, ownerName: "admin", selected: true }],
          selected: {
            ownerName: "admin",
            projectName: "projectYobi",
            projectScope: "public",
          },
          source: {
            isForked: false,
            overview: "Overview",
            ownerName: "admin",
            projectName: "projectYobi",
            projectScope: "public",
            vcs: "GIT",
          },
        }}
        renderShell={false}
        runtimeConfig={runtimeConfig}
      />,
    );
    const layoutSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/route.tsx"),
      "utf8",
    );
    const routeSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/newFork/route.tsx"),
      "utf8",
    );

    expect(layoutSource).toContain("appPath === `/${owner}/${projectName}/newFork`");
    expect(layoutSource).toContain('activeMenu: "pullRequest"');
    expect(routeSource).toContain("renderShell={false}");
    expect(html).not.toContain('class="page-wrap-outer"');
    expect(html).not.toContain('class="project-header-outer"');
    expect(html).not.toContain('class="project-menu-outer"');
    expect(html).toContain('class="project-page-wrap"');
    expect(html).toContain('class="content-wrap frm-wrap"');
    expect(html).toContain('id="helpMessage"');
    expect(html).toContain('id="inputName"');
  });

  it("preserves legacy visibility for protected and Git-only project setting controls", () => {
    const userOwnedHtml = renderToStaticMarkup(
      <ProjectSettingsPage
        detail={{ ...projectDetail, organizationName: "", projectScope: "public" }}
        runtimeConfig={runtimeConfig}
      />,
    );
    const svnHtml = renderToStaticMarkup(
      <ProjectSettingsPage
        detail={{ ...projectDetail, showCode: true, vcs: "Subversion" }}
        runtimeConfig={runtimeConfig}
      />,
    );
    const codeMenuOffHtml = renderToStaticMarkup(
      <ProjectSettingsPage
        defaultBranch="main"
        defaultBranchOptions={[{ name: "main" }, { name: "feature/settings" }]}
        detail={{ ...projectDetail, showCode: false }}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(userOwnedHtml).not.toContain('id="protected"');
    expect(userOwnedHtml).not.toContain('value="PROTECTED"');
    expect(svnHtml).not.toContain("Issue Template");
    expect(svnHtml).not.toContain("postform?issueTemplate=true");
    expect(svnHtml).not.toContain('id="reviewerCountSettingPanel"');
    expect(codeMenuOffHtml).toContain('id="reviewerCountSettingPanel" style="display:none"');
    expect(codeMenuOffHtml).toContain('id="defaultBranceSettingPanel" style="display:none"');
    expect(codeMenuOffHtml).toContain('id="project-default-branch"');
  });

  it("uses default legacy messages without AppRuntimeContext messages", () => {
    const settingsHtml = renderToStaticMarkup(
      <ProjectSettingsPage detail={projectDetail} runtimeConfig={runtimeConfig} />,
    );
    const membersHtml = renderToStaticMarkup(
      <ProjectMembersPage
        detail={{
          enrollmentRequests: [],
          members: [
            {
              avatarUrl: "",
              isOwner: true,
              loginId: "admin",
              role: "manager",
              userId: 1,
              userLabel: "Admin",
            },
            {
              avatarUrl: "",
              isOwner: false,
              loginId: "member",
              role: "member",
              userId: 2,
              userLabel: "Member",
            },
          ],
          ownerName: "admin",
          projectName: "projectYobi",
          roleOptions: [
            { label: "manager", role: "manager" },
            { label: "member", role: "member" },
          ],
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

    expect(settingsHtml).toContain(">Settings</a>");
    expect(settingsHtml).toContain(">Save</button>");
    expect(membersHtml).toContain('placeholder="Add new member ID."');
    expect(membersHtml).toContain('title="Enter Valid ID"');
    expect(membersHtml).toContain('class="label owner">Project owner</span>');
    expect(membersHtml).toContain('class="d-label">Member</span>');
    expect(membersHtml).toContain(">Manager</a>");
    expect(webhooksHtml).toContain(">Create new webhook</strong>");
    expect(webhooksHtml).not.toContain("project.webhook.delivery.");
    expect(webhooksHtml).not.toContain("webhookDeliveryHistory");
    expect(transferHtml).toContain(">new owner or group</div>");
    expect(deleteHtml).toContain(
      ">Once you delete the project, data related to code, board, issues etc. will also be deleted, and won&#x27;t be able to be recovered.</strong>",
    );
    expect(changeVcsHtml).toContain(">Changing the repository to Subversion.</strong>");
  });

  it("renders existing webhook rows with the legacy list shell", () => {
    const html = renderToStaticMarkup(
      <ProjectWebhooksPage
        detail={{
          deliveries: [],
          ownerName: "admin",
          projectName: "projectYobi",
          viewerCanUpdate: true,
          webhookTypes: ["SIMPLE", "JSON"],
          webhooks: [
            {
              gitPush: true,
              id: 7,
              payloadUrl: "https://example.test/hook",
              secret: "",
              webhookType: "JSON",
            },
          ],
        }}
        projectDetail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );
    const viewSource = fs.readFileSync(
      path.resolve(__dirname, "routes/-project-views.tsx"),
      "utf8",
    );

    expect(html).toContain('class="webhook-list-wrap" id="webhooksList"');
    expect(html).toContain('class="row-fluid list-head"');
    expect(html).toContain('class="row-fluid list-item vertical-align" data-webhook-id="7"');
    expect(html).toContain('<h6 class="mr20 truncate">https://example.test/hook</h6>');
    expect(html).toContain("<h6>NONE</h6>");
    expect(html).toContain("<h6>JSON</h6>");
    expect(html).toContain('<input readOnly="" type="checkbox" checked=""/>');
    expect(html).toContain('data-request-method="delete"');
    expect(html).toContain('data-request-uri="/yona/admin/projectYobi/webhooks/7"');
    expect(viewSource).toContain("onClick={(event) => event.preventDefault()}");
    expect(viewSource).not.toContain('onclick="return false;"');
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
    expect(webhooksHtml).toContain("Include git push events");
    expect(webhooksHtml).toContain(">웹후크 추가</button>");
    expect(transferHtml).toContain(">이관받을 사용자 또는 그룹</div>");
    expect(transferHtml).toContain("프로젝트를 이관합니다.</a>");
    expect(deleteHtml).toContain(
      ">프로젝트를 삭제하게되면 코드, 게시판, 이슈 등 모든 데이터가 삭제되며",
    );
    expect(changeVcsHtml).toContain(">코드 저장소 타입을 Subversion으로 변경합니다.</strong>");
    expect(changeVcsHtml).not.toContain(">project.changeVCS.description1 Subversion</strong>");
  });

  it("opts the bounded P4-A project literals into provided legacy message lookups", () => {
    const source = fs.readFileSync(path.resolve(__dirname, "routes/-project-views.tsx"), "utf8");
    const messages = (
      key: string,
      options?: { args?: Array<number | string>; fallback?: string },
    ) =>
      (
        ({
          "button.edit": "EDIT_LOOKUP",
          "code.copyUrl": "COPY_LOOKUP",
          "fork.already.exist": "FORK_EXISTS_LOOKUP",
          "fork.help.message.1": "FORK_HELP_1_LOOKUP",
          "fork.help.message.2": "FORK_HELP_2_LOOKUP",
          "fork.help.title": "FORK_HELP_TITLE_LOOKUP",
          "fork.original": "ORIGIN_LOOKUP",
          "project.name.alert": "PROJECT_NAME_ALERT_LOOKUP",
          "project.watcher.description": "WATCHER_DESCRIPTION_LOOKUP",
          "project.watcher.title": "WATCHER_TITLE_LOOKUP",
          "project.webhook.delivery.created": "DELIVERY_CREATED_LOOKUP",
          "project.webhook.delivery.empty": "DELIVERY_EMPTY_LOOKUP",
          "project.webhook.delivery.event": "DELIVERY_EVENT_LOOKUP",
          "project.webhook.delivery.history": "DELIVERY_HISTORY_LOOKUP",
          "project.webhook.delivery.response": "DELIVERY_RESPONSE_LOOKUP",
          "project.webhook.delivery.response.empty": "DELIVERY_RESPONSE_EMPTY_LOOKUP",
          "project.webhook.delivery.status": "DELIVERY_STATUS_LOOKUP",
          "user.role.manager": "ROLE_MANAGER_LOOKUP",
          "user.role.member": "ROLE_MEMBER_LOOKUP",
          "user.role.owner": "ROLE_OWNER_LOOKUP",
          "user.wrongloginId.alert": "WRONG_LOGIN_LOOKUP",
        }) as Record<string, string>
      )[key] ??
      options?.fallback ??
      key;

    const headerHtml = renderToStaticMarkup(
      <ProjectHeader
        detail={{
          ...projectDetail,
          originOwnerName: "origin",
          originProjectName: "source",
        }}
        messages={messages}
        runtimeConfig={runtimeConfig}
      />,
    );
    const watchersHtml = renderToStaticMarkup(
      <ProjectWatchersPage
        detail={{
          ownerName: "admin",
          projectName: "projectYobi",
          totalCount: 0,
          watchers: [],
        }}
        messages={messages}
        runtimeConfig={runtimeConfig}
      />,
    );
    const membersHtml = renderToStaticMarkup(
      <ProjectMembersPage
        detail={{
          enrollmentRequests: [],
          members: [
            {
              avatarUrl: "",
              isOwner: true,
              loginId: "admin",
              role: "manager",
              userId: 1,
              userLabel: "Admin",
            },
            {
              avatarUrl: "",
              isOwner: false,
              loginId: "member",
              role: "member",
              userId: 2,
              userLabel: "Member",
            },
          ],
          ownerName: "admin",
          projectName: "projectYobi",
          roleOptions: [{ label: "manager", role: "manager" }],
          viewerCanUpdate: true,
        }}
        messages={messages}
        runtimeConfig={runtimeConfig}
      />,
    );
    const webhooksHtml = renderToStaticMarkup(
      <ProjectWebhooksPage
        detail={{
          deliveries: [
            {
              createdLabel: "2026-06-21 12:00",
              errorMessage: "",
              eventType: "issue",
              id: 1,
              payloadUrl: "https://example.test/hook",
              requestBody: "{}",
              responseBody: "",
              status: "SUCCESS",
              webhookId: 1,
              webhookType: "SIMPLE",
            },
          ],
          ownerName: "admin",
          projectName: "projectYobi",
          viewerCanUpdate: true,
          webhookTypes: ["SIMPLE"],
          webhooks: [],
        }}
        messages={messages}
        projectDetail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );
    const forkHelpHtml = renderToStaticMarkup(
      <ProjectForkPage
        detail={projectDetail}
        forkOptions={{
          canFork: true,
          existingForks: [],
          ownerOptions: [{ organization: false, ownerName: "admin", selected: true }],
          selected: {
            ownerName: "admin",
            projectName: "projectYobi",
            projectScope: "public",
          },
          source: {
            isForked: false,
            overview: "Overview",
            ownerName: "admin",
            projectName: "projectYobi",
            projectScope: "public",
            vcs: "GIT",
          },
        }}
        messages={messages}
        runtimeConfig={runtimeConfig}
      />,
    );
    const forkExistsHtml = renderToStaticMarkup(
      <ProjectForkPage
        detail={projectDetail}
        forkOptions={{
          canFork: true,
          existingForks: [{ ownerName: "admin", projectName: "forked" }],
          ownerOptions: [{ organization: false, ownerName: "admin", selected: true }],
          selected: {
            ownerName: "admin",
            projectName: "projectYobi",
            projectScope: "public",
          },
          source: {
            isForked: false,
            overview: "Overview",
            ownerName: "admin",
            projectName: "projectYobi",
            projectScope: "public",
            vcs: "GIT",
          },
        }}
        messages={messages}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(headerHtml).toContain(">ORIGIN_LOOKUP</span>");
    expect(watchersHtml).toContain(">WATCHER_TITLE_LOOKUP</strong>");
    expect(watchersHtml).toContain(">WATCHER_DESCRIPTION_LOOKUP</p>");
    expect(membersHtml).toContain('title="WRONG_LOGIN_LOOKUP"');
    expect(membersHtml).toContain(">ROLE_OWNER_LOOKUP</span>");
    expect(membersHtml).toContain(">ROLE_MEMBER_LOOKUP</span>");
    expect(membersHtml).toContain(">ROLE_MANAGER_LOOKUP</a>");
    expect(webhooksHtml).not.toContain("project.webhook.delivery.");
    expect(webhooksHtml).not.toContain("webhookDeliveryHistory");
    expect(forkHelpHtml).toContain(">FORK_HELP_TITLE_LOOKUP</p>");
    expect(forkHelpHtml).toContain(">FORK_HELP_1_LOOKUP</p>");
    expect(forkHelpHtml).toContain(">FORK_HELP_2_LOOKUP</p>");
    expect(forkHelpHtml).toContain(">PROJECT_NAME_ALERT_LOOKUP</span>");
    expect(forkExistsHtml).toContain(">FORK_EXISTS_LOOKUP</p>");
    expect(source).toContain('legacyMessage(messages, "project.import.auth.userid")');
    expect(source).toContain('legacyMessage(messages, "project.import.auth.userpw")');
    expect(source).toContain('legacyMessage(messages, "button.edit")');
    expect(source).toContain('legacyMessage(messages, "code.copyUrl")');
  });
});
