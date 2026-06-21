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
  "app.welcome.group.desc": "그룹 설명",
  "app.welcome.project.desc": "프로젝트 설명",
  "app.welcome.searchProject.desc": "프로젝트 찾기 설명",
  "button.newProject": "새 프로젝트 만들기",
  "button.setDefaultLoginPage": "기본 페이지로 지정",
  "button.setDefaultLoginPage.desc": "현재 페이지를 기본 페이지로 지정합니다",
  "button.signup": "{0} 시작 하기",
  "issue.myIssue": "내 이슈",
  notification: "알림",
  "notification.none": "알림 메시지가 없습니다.",
  "organization.is.empty": "속한 그룹이 없습니다.",
  "project.codeUpdate": "최근 코드 업데이트",
  "project.is.empty": "프로젝트가 존재하지 않습니다.",
  "project.public": "공개",
  "search.title": "검색",
  "site.features.codeManagement": "코드 관리 설명",
  "site.features.codeReview": "코드 리뷰 설명",
  "site.features.issueTracker": "이슈 트래커 설명",
  "site.features.privateRepositories": "비공개 프로젝트 설명",
  "site.features.unlimitedProjects": "프로젝트 설명",
  "site.features.workTeam": "팀 작업 설명",
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
  "title.unlimitedProjects": "프로젝트/그룹 기반 작업",
  "title.workTeam": "팀 작업",
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
    expect(html).toContain(">팀 작업 설명</p>");
    expect(html).toContain('placeholder="검색"');
    expect(html).toContain(">알림</a>");
    expect(html).toContain(">내 이슈</a>");
    expect(html).toContain(">내 파일</a>");
    expect(html).toContain(">새 프로젝트 만들기</a>");
    expect(html).toContain(">프로젝트 찾기 설명</td>");
    expect(html).not.toContain(">project.public title.projectList</a>");
    expect(html).not.toContain('placeholder="site.project.filter"');
  });
});
