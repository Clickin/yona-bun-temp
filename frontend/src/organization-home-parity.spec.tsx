import { describe, expect, it } from "vitest";
import { renderOrganizationDetail } from "./auth-workspace-shell.test-helpers";

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
      memberMembers: [
        {
          avatarUrl: "/avatars/member.png",
          loginId: "member",
          role: "org_member",
          userLabel: "Member",
        },
      ],
      organizationName: "weblabs",
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

    expect(html).toContain('class="app-shell organization-page page-wrap-outer"');
    expect(html).toContain('class="project-page-wrap organization-home-wrap"');
    expect(html).toContain('class="project-home-header row-fluid"');
    expect(html).toContain('class="project-overview span9 span-hard-wrap"');
    expect(html).toContain('class="project-description"');
    expect(html).toContain('class="markdown-wrap"');
    expect(html).toContain('class="row-fluid organization-home-body"');
    expect(html).toContain('class="span9 span-left-pane"');
    expect(html).toContain('class="project-list-wrap organization-project-list"');
    expect(html).toContain('class="listitem organization-project-card"');
    expect(html).toContain('class="span3 span-right-pane"');
    expect(html).toContain('class="bubble-wrap gray organization-home"');
    expect(html).toContain('class="organization-member-wrap"');
  });
});
