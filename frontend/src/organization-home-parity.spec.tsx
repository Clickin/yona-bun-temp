import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { renderOrganizationDetail } from "./auth-workspace-shell.test-helpers";
import { OrganizationNewPage, OrganizationSettingsPage } from "./routes/-organization-views";

describe("organization home parity", () => {
  it("renders the legacy page shell, project list, and roster side pane anchors", () => {
    const html = renderOrganizationDetail({
      adminMembers: [
        {
          avatarUrl: "/avatars/admin.png",
          loginId: "admin",
          role: "org_admin",
          userLabel: "Admin",
        },
      ],
      description: "Web labs",
      logoUrl: "/logos/weblabs.png",
      memberMembers: [
        {
          avatarUrl: "/avatars/member.png",
          loginId: "member",
          role: "org_member",
          userLabel: "Member",
        },
      ],
      organizationName: "weblabs",
      viewerCanEnroll: true,
      viewerCanCreateProject: true,
      viewerCanUpdate: true,
      visibleProjects: [
        {
          createdLabel: "2026-04-01",
          isWatching: true,
          lastPushedLabel: "2026-04-10",
          logoUrl: "/logos/projectYobi.png",
          memberCount: 4,
          originOwnerName: "naver",
          originProjectName: "legacyYobi",
          overview: "Wave 2A parity home",
          ownerName: "weblabs",
          projectName: "projectYobi",
          projectScope: "public",
          watchCount: 3,
        },
      ],
    } as never);

    expect(html).toContain('class="app-shell organization-page"');
    expect(html).toContain('class="page-wrap-outer"');
    expect(html).toContain('class="project-page-wrap organization-home-wrap"');
    expect(html).not.toContain('class="app-shell organization-page page-wrap-outer"');
    expect(html).toContain('class="project-header-outer"');
    expect(html).toContain("background-image:url(&#x27;/logos/weblabs.png&#x27;)");
    expect(html).toContain('class="project-header-inner"');
    expect(html).toContain('class="project-header-wrap"');
    expect(html).toContain('class="project-header-avatar"');
    expect(html).toContain('<img alt="" src="/logos/weblabs.png"/>');
    expect(html).toContain('class="group-title-head">group</span>');
    expect(html).toContain('<a href="/yona/organizations/weblabs">weblabs</a>');
    expect(html).toContain('class="project-util-wrap"');
    expect(html).toContain('class="project-util"');
    expect(html).toContain('data-toggle="dropdown" type="button"');
    expect(html).toContain("organization.member.enrollment.title");
    expect(html).toContain('class="dropdown-menu flat right title"');
    expect(html).toContain("organization.you.may.want.to.be.a.member weblabs");
    expect(html).toContain("organization.member.enrollment.help.before");
    expect(html).toContain(
      'class="ybtn ybtn-info enrollBtn" href="/yona/organizations/weblabs/enroll" id="enrollBtn"',
    );
    expect(html).toContain("button.new.enrollment");
    expect(html).toContain('class="project-menu-nav project-menu-gruop"');
    expect(html).toContain(
      '<li class="active"><a href="/yona/organizations/weblabs">title.organizationHome</a>',
    );
    expect(html).toContain('href="/yona/organizations/weblabs/issues"');
    expect(html).toContain('href="/yona/organizations/weblabs/boards"');
    expect(html).toContain('href="/yona/organizations/weblabs/pullrequests"');
    expect(html).toContain('class="project-home-header row-fluid"');
    expect(html).toContain('class="project-overview span9 span-hard-wrap"');
    expect(html).toContain('class="project-description"');
    expect(html).toContain('class="markdown-wrap"');
    expect(html).toContain('class="row-fluid organization-home-body"');
    expect(html).toContain('class="span9 span-left-pane"');
    expect(html).toContain('class="project-list-wrap organization-project-list"');
    expect(html).toContain('class="listitem organization-project-card"');
    expect(html).toContain('class="yobicon-friends yobicon-middle"');
    expect(html).toContain("<strong>4</strong>");
    expect(html).toContain('class="yobicon-eye"');
    expect(html).toContain("<strong>3</strong>");
    expect(html).not.toContain("project.onmember 4");
    expect(html).not.toContain("project.onwatching 3");
    expect(html).toContain('class="span3 span-right-pane"');
    expect(html).toContain('class="bubble-wrap gray organization-home"');
    expect(html).toContain('class="organization-member-wrap"');
  });

  it("keeps organization leave mutation fallback on the legacy unknown-error key", () => {
    const routeSource = readFileSync(
      resolve(process.cwd(), "src/routes/organizations/$organizationName/route.tsx"),
      "utf8",
    );

    expect(routeSource).toContain("organization.member.leave.unknownerror");
    expect(routeSource).toContain("user.enroll.failed.network");
    expect(routeSource).toContain("user.enroll.failed.client");
    expect(routeSource).toContain("user.enroll.failed.server");
    expect(routeSource).not.toContain("Leave organization failed.");
    expect(routeSource).not.toContain("Server Error");
    expect(routeSource).not.toContain("Cancel enrollment failed.");
    expect(routeSource).not.toContain("Enroll failed.");
  });

  it("keeps legacy organization submit copy while mutations are pending", () => {
    const newHtml = renderToStaticMarkup(<OrganizationNewPage pending />);
    expect(newHtml).toContain('<button class="ybtn ybtn-success" disabled="" type="submit">');
    expect(newHtml).toContain("organization.create");
    expect(newHtml).not.toContain("organization.creating");

    const settingsHtml = renderToStaticMarkup(
      <OrganizationSettingsPage
        detail={{
          adminMembers: [],
          description: "Web labs",
          memberMembers: [],
          organizationName: "weblabs",
          viewerCanCreateProject: true,
          viewerCanUpdate: true,
          visibleProjects: [],
        }}
        pending
        runtimeConfig={{ apiBaseUrl: "/yona/api", basePath: "/yona", showUserEmail: true }}
      />,
    );
    expect(settingsHtml).toContain('id="save" type="submit"');
    expect(settingsHtml).toContain("button.save");
    expect(settingsHtml).not.toContain("button.saving");
  });
});
