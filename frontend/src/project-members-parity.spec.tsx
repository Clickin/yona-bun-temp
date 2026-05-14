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
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('class="page-wrap-outer"');
    expect(html).toContain('class="project-page-wrap"');
    expect(html).toContain('id="addNewMember"');
    expect(html).toContain('id="loginId"');
    expect(html).toContain('placeholder="project.members.addMember"');
    expect(html).toContain('class="members project row-fluid"');
    expect(html).toContain('class="member span6 span-hard-wrap"');
    expect(html).toContain('class="label owner"');
    expect(html).toContain('data-name="roleof-member"');
    expect(html).toContain('data-action="apply"');
    expect(html).toContain('data-href="/owner/projectYobi/member/2/edit"');
    expect(html).toContain('data-action="delete"');
    expect(html).toContain('data-href="/owner/projectYobi/member/2/delete"');
    expect(html).toContain("project.member.enrollment.request");
    expect(html).toContain('class="ybtn ybtn-info ybtn-mini blue enrollAcceptBtn"');
  });
});
