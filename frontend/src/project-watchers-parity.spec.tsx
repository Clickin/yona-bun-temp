import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";
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
    expect(html).toContain('class="project-header-outer"');
    expect(html).toContain('class="project-header-inner"');
    expect(html).toContain('class="project-header-wrap"');
    expect(html).toContain('<a href="/yona/weblabs">weblabs</a>');
    expect(html).toContain('<a href="/yona/weblabs/projectYobi">projectYobi</a>');
    expect(html).toContain('class="project-menu-outer"');
    expect(html).toContain('class="page-wrap-outer"');
    expect(html).toContain('class="members project row-fluid"');
    expect(html).toContain('class="member span6 span-hard-wrap"');
    expect(html).toContain('href="/yona/admin"');
    expect(html).toContain('<img height="64" src="/avatars/admin.png" width="64"/>');
    expect(html).toContain("@member");
    expect(html).not.toContain("avatar&quot;");
    expect(html).not.toContain('alt="');
  });

  it("classifies legacy project watcher READ authorization failures", () => {
    const routeSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$owner/$projectName/watchers/route.tsx"),
      "utf8",
    );

    expect(routeSource).toContain("classifyConnectFailure");
    expect(routeSource).toContain("BadRequestPage");
    expect(routeSource).toContain("ForbiddenPage");
    expect(routeSource).toContain("NotFoundPage");
    expect(routeSource).toContain('"bad-request"');
    expect(routeSource).not.toContain("Read project watchers failed.");
  });
});
