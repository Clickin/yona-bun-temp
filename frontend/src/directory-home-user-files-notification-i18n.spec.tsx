import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { LegacyI18nContextValue } from "./i18n";
import { testRuntimeConfig } from "./auth-workspace-shell.test-helpers";
import { OrganizationDirectoryPage, ProjectDirectoryPage } from "./routes/-directory-views";
import { HomePage } from "./routes/-home-view";
import { NotificationWelcomeGuide } from "./routes/notification/route";
import { UserFilesPage } from "./routes/user/files/route";

type LegacyMessageLookup = LegacyI18nContextValue["t"];

const translated: Record<string, string> = {
  "app.welcome.group.desc":
    "다른 멤버들과 함께 그룹으로 작업을 하고싶으시면, 그룹을 생성하여 여러 프로젝트를 공동으로 관리해보세요.",
  "app.welcome.project.desc": "당신만의 프로젝트를 만들어 보세요",
  "app.welcome.searchProject.desc": "관심있는 프로젝트를 찾아보세요",
  "button.newProject": "새 프로젝트 만들기",
  "button.setDefaultLoginPage": "기본 페이지로 지정",
  "button.setDefaultLoginPage.desc":
    "현재 페이지를 로그인 후 표시되는 기본 인덱스 페이지로 지정합니다",
  "button.signup": "{0} 시작 하기",
  "issue.myIssue": "내 이슈",
  notification: "알림",
  "notification.none": "알림 메시지가 없습니다.",
  "organization.is.empty": "속한 그룹이 없습니다.",
  "project.codeUpdate": "최근 코드 업데이트",
  "project.is.empty": "프로젝트가 존재하지 않습니다.",
  "project.public": "공개",
  "search.title": "검색",
  "site.features.codeManagement":
    "작성한 코드는 모두 이력이 관리되는 형태로 안전하게 서버에 보관됩니다.",
  "site.features.codeReview":
    "변경된 코드를 보면서 팀원들과 토론해보세요. 코드의 완성도를 더욱 높일 수 있습니다.",
  "site.features.issueTracker":
    "팀이 함께 고민하고 처리해야 하는 내용들을 적고 거친 파도를 합심해 헤쳐나가듯 해결해 나갑니다.",
  "site.features.privateRepositories":
    "다른 사람에게 공개하고 싶지 않은 비밀 프로젝트 공간을 만들어 자유롭게 생각의 나래를 펼쳐보세요.",
  "site.features.unlimitedProjects":
    "프로젝트/그룹 기반으로 효율적으로 개발을 진행 할 수 있습니다.",
  "site.features.workTeam":
    "프로젝트별로 멤버를 자유롭게 구성할수 있는 쉽고 간편한 멤버관리 기능이 제공 됩니다.",
  "site.organization.filter": "키워드로 그룹 찾기",
  "site.project.filter": "키워드로 프로젝트 찾기",
  "title.codeManagement": "코드 관리",
  "title.codeReview": "코드 리뷰",
  "title.features": "주요 기능 소개",
  "title.issueTracker": "이슈 트래커",
  "title.newOrganization": "새 그룹 만들기",
  "title.organization.list": "그룹 목록",
  "title.privateProject": "비공개 프로젝트",
  "title.projectList": "프로젝트 목록",
  "title.unlimitedProjects": "프로젝트/그룹 기반으로 작업",
  "title.workTeam": "팀 구성",
  "user.files": "내 파일",
};

const messages: LegacyMessageLookup = (key, options) => {
  const template = translated[key] ?? options?.fallback ?? key;
  return template.replace(/\{(\d+)}/g, (_placeholder, index) =>
    String(options?.args?.[Number(index)] ?? `{${index}}`),
  );
};

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
    const html = renderDirectoryHomeUserFilesNotification(messages);

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
