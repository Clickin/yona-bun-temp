import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createLegacyI18nRuntime } from "./i18n";
import { testRuntimeConfig } from "./auth-workspace-shell.test-helpers";
import { OrganizationDirectoryPage, ProjectDirectoryPage } from "./routes/-directory-views";
import { HomePage } from "./routes/-home-view";
import { NotificationWelcomeGuide } from "./routes/notification/route";
import { UserFilesPage } from "./routes/user/files/route";

type LegacyMessageLookup = ReturnType<typeof createLegacyI18nRuntime>["t"];

const defaultMessages = createLegacyI18nRuntime(["en-US"]).t;

function renderDirectoryHomeUserFilesNotification(
  messagesLookup: LegacyMessageLookup = defaultMessages,
) {
  return renderToStaticMarkup(
    <>
      <ProjectDirectoryPage
        directory={{ items: [] }}
        href="/projects"
        messages={messagesLookup}
        runtimeConfig={testRuntimeConfig}
      />
      <OrganizationDirectoryPage
        directory={{ items: [] }}
        href="/orgs"
        messages={messagesLookup}
        runtimeConfig={testRuntimeConfig}
      />
      <HomePage messages={messagesLookup} runtimeConfig={testRuntimeConfig} />
      <UserFilesPage
        basePath="/yona"
        files={{ files: [], filter: "", page: 1, pageSize: 20, total: 0, totalPages: 0 }}
        messages={messagesLookup}
        query={{ filter: "", page: 1 }}
      />
      <NotificationWelcomeGuide basePath="/yona" messages={messagesLookup} siteName="Yona" />
    </>,
  );
}

describe("directory/home/user-files/notification legacy i18n opt-in", () => {
  it("uses legacy default messages for direct-rendered helper surfaces", () => {
    const html = renderDirectoryHomeUserFilesNotification();

    expect(html).toContain(">PUBLIC Project list</a>");
    expect(html).toContain('placeholder="Search by keyword"');
    expect(html).toContain(">Project is non existent</p>");
    expect(html).toContain('placeholder="Find organization by name"');
    expect(html).toContain(">You do not belong to any group</p>");
    expect(html).toContain(">Key features</span>");
    expect(html).toContain(
      ">Yona provides a simple and easy team management tool to help you build teams for projects.</p>",
    );
    expect(html).toContain('placeholder="Search"');
    expect(html).toContain(">Notification</a>");
    expect(html).toContain(">My Issues</a>");
    expect(html).toContain(">My Files</a>");
    expect(html).toContain(">Create new project</a>");
    expect(html).toContain(">Find a project in which you are interested</td>");
    expect(html).not.toContain(">project.public title.projectList</a>");
    expect(html).not.toContain('placeholder="site.project.filter"');
  });

  it("uses a supplied legacy message lookup for the touched keys", () => {
    const runtime = createLegacyI18nRuntime(["en-US", "ko-KR"]);
    runtime.setLanguage("ko-KR");
    const html = renderDirectoryHomeUserFilesNotification(runtime.t);

    expect(html).toContain(">공개 프로젝트 목록</a>");
    expect(html).toContain('placeholder="키워드로 프로젝트 찾기"');
    expect(html).toContain(">프로젝트가 존재하지 않습니다.</p>");
    expect(html).toContain('placeholder="키워드로 그룹 찾기"');
    expect(html).toContain(">속한 그룹이 없습니다.</p>");
    expect(html).toContain(">주요 기능 소개</span>");
    expect(html).toContain(
      ">프로젝트별로 멤버를 자유롭게 구성할수 있는 쉽고 간편한 멤버관리 기능이 제공 됩니다.</p>",
    );
    expect(html).toContain('placeholder="검색"');
    expect(html).toContain(">알림</a>");
    expect(html).toContain(">내 이슈</a>");
    expect(html).toContain(">내 파일</a>");
    expect(html).toContain(">새 프로젝트 만들기</a>");
    expect(html).toContain(">관심있는 프로젝트를 찾아보세요</td>");
    expect(html).not.toContain(">project.public title.projectList</a>");
    expect(html).not.toContain('placeholder="site.project.filter"');
  });
});
