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

function renderDirectoryHomeUserFilesNotification(messagesLookup?: LegacyMessageLookup) {
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
  it("keeps legacy message-key fallbacks without a provider", () => {
    const html = renderDirectoryHomeUserFilesNotification();

    expect(html).toContain(">project.public title.projectList</a>");
    expect(html).toContain('placeholder="site.project.filter"');
    expect(html).toContain(">project.is.empty</p>");
    expect(html).toContain('placeholder="site.organization.filter"');
    expect(html).toContain(">organization.is.empty</p>");
    expect(html).toContain(">title.features</span>");
    expect(html).toContain(">site.features.workTeam</p>");
    expect(html).toContain('placeholder="search.title"');
    expect(html).toContain(">notification</a>");
    expect(html).toContain(">issue.myIssue</a>");
    expect(html).toContain(">user.files</a>");
    expect(html).toContain(">button.newProject</a>");
    expect(html).toContain(">app.welcome.searchProject.desc</td>");
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
