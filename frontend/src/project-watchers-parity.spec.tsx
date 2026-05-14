import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { ProjectWatchersPage } from "./routes/-project-views";
import type { RuntimeConfig } from "./runtime-config";

const runtimeConfig: RuntimeConfig = {
  apiBaseUrl: "/yona/api",
  basePath: "/yona",
};

describe("project watchers parity", () => {
  it("renders the legacy project watchers page shell and member rows", () => {
    const html = renderToString(
      <ProjectWatchersPage
        detail={{
          ownerName: "weblabs",
          projectName: "projectYobi",
          totalCount: 2,
          watchers: [
            {
              avatarUrl: "/avatars/admin.png",
              loginId: "admin",
              userId: 1,
              userLabel: "Admin",
            },
            {
              avatarUrl: "/avatars/member.png",
              loginId: "member",
              userId: 2,
              userLabel: "Member",
            },
          ],
        }}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain("project.watcher.title");
    expect(html).toContain("project.watcher.description");
    expect(html).toContain('class="page-wrap-outer"');
    expect(html).toContain('class="members project row-fluid"');
    expect(html).toContain('class="member span6 span-hard-wrap"');
    expect(html).toContain('href="/yona/admin"');
    expect(html).toContain("@member");
  });
});
