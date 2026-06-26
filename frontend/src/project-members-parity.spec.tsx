import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { ProjectMembersPage } from "./routes/-project-views";
import type { RuntimeConfig } from "./runtime-config";

const runtimeConfig: RuntimeConfig = {
  apiBaseUrl: "/yona/api",
  basePath: "/yona",
};

describe("project members parity", () => {
  it("renders the legacy project member management anchors", () => {
    const html = renderToString(
      <ProjectMembersPage
        detail={{
          enrollmentRequests: [
            {
              avatarUrl: "/avatars/guest.png",
              loginId: "guest",
              userId: 3,
              userLabel: "Guest",
            },
          ],
          members: [
            {
              avatarUrl: "/avatars/owner.png",
              isOwner: true,
              loginId: "owner",
              role: "manager",
              userId: 1,
              userLabel: "Owner",
            },
            {
              avatarUrl: "/avatars/member.png",
              isOwner: false,
              loginId: "member",
              role: "member",
              userId: 2,
              userLabel: "Member",
            },
          ],
          ownerName: "owner",
          projectName: "projectYobi",
          roleOptions: [
            { label: "manager", role: "manager" },
            { label: "member", role: "member" },
          ],
          viewerCanUpdate: true,
        }}
        onAddMember={vi.fn()}
        onDeleteMember={vi.fn()}
        onUpdateMemberRole={vi.fn()}
        projectDetail={{
          boardCount: 2,
          enrollmentRequestCount: 1,
          enrollmentRequested: false,
          isFavorited: false,
          logoUrl: "/logos/projectYobi.png",
          organizationName: "",
          overview: "",
          ownerName: "owner",
          projectName: "projectYobi",
          projectScope: "private",
          showBoard: true,
          showCode: false,
          showIssue: false,
          showMilestone: false,
          showPullRequest: false,
          showReview: false,
          viewerCanEnroll: false,
          viewerCanUpdate: true,
        }}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('class="page-wrap-outer"');
    expect(html).toContain('class="project-header-outer"');
    expect(html).toContain('class="project-header-inner"');
    expect(html).toContain('class="project-header-wrap"');
    expect(html).toContain('<a href="/yona/owner">owner</a>');
    expect(html).toContain('<a href="/yona/owner/projectYobi">projectYobi</a>');
    expect(html).toContain('<img alt="" src="/logos/projectYobi.png"/>');
    expect(html).toContain('class="project-private"');
    expect(html).toContain('class="project-menu-outer"');
    expect(html).toContain('<span class="menu-name">Board</span>');
    expect(html).toContain('<span class="project-menu-count">2</span>');
    expect(html).not.toContain('<span class="menu-name">Code</span>');
    expect(html).toContain('class="project-page-wrap"');
    expect(html).toContain('<span class="num-badge">1</span>');
    expect(html).toContain('id="addNewMember"');
    expect(html).toContain('id="loginId"');
    expect(html).toContain('placeholder="Add new member ID."');
    expect(html).toContain('class="members project row-fluid"');
    expect(html).toContain('class="member span6 span-hard-wrap"');
    expect(html).toContain('class="label owner"');
    expect(html).toContain('data-name="roleof-member"');
    expect(html).toContain('data-action="apply"');
    expect(html).toContain('data-href="/owner/projectYobi/member/2/edit"');
    expect(html).toContain('data-loginId="member"');
    expect(html).toContain('href="#member-role"');
    expect(html).not.toContain('data-loginid="member"');
    expect(html).not.toContain('href="javascript:void(0)"');
    expect(html).toContain('data-action="delete"');
    expect(html).toContain('data-href="/owner/projectYobi/member/2/delete"');
    expect(html).toContain("Sign-up request");
    expect(html).toContain('class="ybtn ybtn-info ybtn-mini blue enrollAcceptBtn"');
  });

  it("keeps project member mutation fallbacks on legacy message keys", () => {
    const routeSource = readFileSync(
      resolve(process.cwd(), "src/routes/$owner/$projectName/members/route.tsx"),
      "utf8",
    );

    expect(routeSource).not.toContain("Add project member failed.");
    expect(routeSource).not.toContain("Update project member role failed.");
    expect(routeSource).not.toContain("Delete project member failed.");
    expect(routeSource).toContain("readProjectContainerQueryOptions");
    expect(routeSource).toContain("toProjectContainerView");
    expect(routeSource).toContain("projectDetail=");
    expect(routeSource).toContain('messages("error.badrequest", { fallback: "error.badrequest" })');
    expect(routeSource).toContain(
      'messages("project.member.ownerMustBeAManager", {\n              fallback: "project.member.ownerMustBeAManager",',
    );
    expect(routeSource).toContain("useNavigate");
    expect(routeSource).toContain("prefixBasePath");
    expect(routeSource).toContain("runtimeConfig.basePath");
    expect(routeSource).not.toContain("navigateToAppHref(");
    expect(routeSource).not.toContain("window.location.assign(");
    expect(routeSource).not.toContain("`${runtimeConfig.basePath}${detail.redirectPath}`");
  });

  it("lets the project layout route own the members settings shell", () => {
    const html = renderToString(
      <ProjectMembersPage
        detail={{
          enrollmentRequests: [],
          members: [],
          ownerName: "owner",
          projectName: "projectYobi",
          roleOptions: [],
          viewerCanUpdate: true,
        }}
        projectDetail={{
          enrollmentRequestCount: 0,
          enrollmentRequested: false,
          isFavorited: false,
          organizationName: "",
          overview: "",
          ownerName: "owner",
          projectName: "projectYobi",
          projectScope: "private",
          viewerCanEnroll: false,
          viewerCanUpdate: true,
        }}
        renderShell={false}
        runtimeConfig={runtimeConfig}
      />,
    );
    const layoutSource = readFileSync(
      resolve(process.cwd(), "src/routes/$owner/$projectName/route.tsx"),
      "utf8",
    );
    const routeSource = readFileSync(
      resolve(process.cwd(), "src/routes/$owner/$projectName/members/route.tsx"),
      "utf8",
    );

    expect(layoutSource).toContain("appPath === `/${owner}/${projectName}/members`");
    expect(layoutSource).toContain('return { activeMenu: "settings" };');
    expect(routeSource).toContain("renderShell={false}");
    expect(html).not.toContain('class="page-wrap-outer"');
    expect(html).not.toContain('class="project-header-outer"');
    expect(html).not.toContain('class="project-menu-outer"');
    expect(html).toContain('class="project-page-wrap"');
    expect(html).toContain('id="subMenuProjectMember"');
    expect(html).toContain('id="addNewMember"');
  });
});
