import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LegacyI18nProvider } from "./i18n";
import { ProjectMenu } from "./routes/-project-views";
import type { ProjectDetailViewModel } from "./routes/-view-models";

const projectDetail: ProjectDetailViewModel = {
  boardCount: 2,
  enrollmentRequested: false,
  isFavorited: false,
  openIssueCount: 3,
  openPullRequestCount: 1,
  organizationName: "",
  overview: "",
  ownerName: "admin",
  projectName: "projectYobi",
  projectScope: "public",
  reviewCount: 1,
  showAdmin: true,
  showBoard: true,
  showCode: true,
  showIssue: true,
  showMilestone: true,
  showPullRequest: true,
  showReview: true,
  viewerCanEnroll: false,
  viewerCanUpdate: true,
};

const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };

describe("project keymap help parity", () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");

  function withUserAgent(userAgent: string, render: () => void) {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { userAgent },
    });
    try {
      render();
    } finally {
      if (originalNavigator) {
        Object.defineProperty(globalThis, "navigator", originalNavigator);
      } else {
        delete (globalThis as { navigator?: Navigator }).navigator;
      }
    }
  }

  it("does not render keymap help from projectMenu unless a legacy page requests it", () => {
    const html = renderToStaticMarkup(
      <ProjectMenu activeMenu="settings" detail={projectDetail} runtimeConfig={runtimeConfig} />,
    );

    expect(html).toContain('class="project-menu-outer"');
    expect(html).not.toContain('href="#helpKeys"');
    expect(html).not.toContain('class="modal hide fade keymap-help"');
  });

  it("renders legacy issue list shortcuts", () => {
    const html = renderToStaticMarkup(
      <ProjectMenu
        activeMenu="issue"
        detail={projectDetail}
        keymapMode="list"
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('href="#helpKeys"');
    expect(html).toContain('class="modal hide fade keymap-help"');
    expect(html).toContain("<h5>Issue list</h5>");
    expect(html).toContain('<span class="help-inline">New issue</span>');
    expect(html).toContain('<span class="help-inline">Previous page</span>');
    expect(html).toContain('<span class="help-inline">Next page</span>');
    expect(html).toContain('<span class="ybtn ybtn-small">CTRL</span> + <span');
    expect(html).toContain('<span class="ybtn ybtn-small">ALT</span> + <span');
    expect(html).toContain('<span class="help-inline">Select all</span>');
  });

  it("keeps project menu and keymap labels on legacy key fallbacks without a runtime provider", () => {
    const html = renderToStaticMarkup(
      <ProjectMenu
        activeMenu="code"
        detail={projectDetail}
        keymapMode="detail"
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('<span class="menu-name">Code</span>');
    expect(html).toContain(">Keyboard shortcuts</a>");
    expect(html).toContain("<h5>Code</h5>");
    expect(html).toContain('<span class="help-inline">List</span>');
  });

  it("switches project menu and keymap labels through legacy message dictionaries", () => {
    const englishHtml = renderToStaticMarkup(
      <LegacyI18nProvider supportedLanguages={["en-US", "ko-KR"]}>
        <ProjectMenu
          activeMenu="issue"
          detail={projectDetail}
          keymapMode="list"
          runtimeConfig={runtimeConfig}
        />
      </LegacyI18nProvider>,
    );
    const koreanHtml = renderToStaticMarkup(
      <LegacyI18nProvider supportedLanguages={["ko-KR", "en-US"]}>
        <ProjectMenu
          activeMenu="issue"
          detail={projectDetail}
          keymapMode="list"
          runtimeConfig={runtimeConfig}
        />
      </LegacyI18nProvider>,
    );

    expect(englishHtml).toContain('<span class="menu-name">Issue</span>');
    expect(englishHtml).toContain(">Keyboard shortcuts</a>");
    expect(englishHtml).toContain("<h5>Issue list</h5>");
    expect(englishHtml).toContain('<span class="help-inline">New issue</span>');
    expect(englishHtml).toContain('<span class="help-inline">Profile</span>');
    expect(englishHtml).toContain('<span class="help-inline">User menu</span>');
    expect(englishHtml).not.toContain('<span class="menu-name">menu.issue</span>');

    expect(koreanHtml).toContain('<span class="menu-name">이슈</span>');
    expect(koreanHtml).toContain(">단축키 안내</a>");
    expect(koreanHtml).toContain("<h5>이슈 목록</h5>");
    expect(koreanHtml).toContain('<span class="help-inline">새 이슈</span>');
    expect(koreanHtml).toContain('<span class="help-inline">프로필 페이지</span>');
    expect(koreanHtml).toContain('<span class="help-inline">사용자 메뉴</span>');
    expect(koreanHtml).not.toContain('<span class="menu-name">menu.issue</span>');
  });

  it("preserves exact fallback copy for missing project keymap dictionary entries", () => {
    const html = renderToStaticMarkup(
      <LegacyI18nProvider supportedLanguages={["ko-KR", "en-US"]}>
        <ProjectMenu
          activeMenu="board"
          detail={projectDetail}
          keymapMode="detail"
          runtimeConfig={runtimeConfig}
        />
      </LegacyI18nProvider>,
    );

    expect(html).toContain("<h5>title.boardDetail</h5>");
    expect(html).toContain('<span class="help-inline">목록</span>');
    expect(html).toContain('<span class="help-inline">수정</span>');
  });

  it("renders legacy issue detail shortcuts", () => {
    const html = renderToStaticMarkup(
      <ProjectMenu
        activeMenu="issue"
        detail={projectDetail}
        keymapMode="detail"
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain("<h5>Issue details</h5>");
    expect(html).toContain('<span class="help-inline">New issue</span>');
    expect(html).toContain('<span class="help-inline">List</span>');
    expect(html).toContain('<span class="help-inline">Edit</span>');
    expect(html).toContain("<h5>Issue Comments</h5>");
    expect(html).toContain('<span class="help-inline">Comment &amp; Close issue</span>');
  });

  it("renders legacy board list and detail shortcuts", () => {
    const listHtml = renderToStaticMarkup(
      <ProjectMenu
        activeMenu="board"
        detail={projectDetail}
        keymapMode="list"
        runtimeConfig={runtimeConfig}
      />,
    );
    const detailHtml = renderToStaticMarkup(
      <ProjectMenu
        activeMenu="board"
        detail={projectDetail}
        keymapMode="detail"
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(listHtml).toContain("<h5>Posting List</h5>");
    expect(listHtml).toContain('<span class="help-inline">New post</span>');
    expect(listHtml).toContain('<span class="help-inline">Previous page</span>');
    expect(listHtml).toContain('<span class="help-inline">Next page</span>');
    expect(detailHtml).toContain("<h5>title.boardDetail</h5>");
    expect(detailHtml).toContain('<span class="help-inline">New post</span>');
    expect(detailHtml).toContain('<span class="help-inline">List</span>');
    expect(detailHtml).toContain('<span class="help-inline">Edit</span>');
  });

  it("renders legacy Mac modifier keys from the Macintosh user agent", () => {
    withUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36", () => {
      const html = renderToStaticMarkup(
        <ProjectMenu
          activeMenu="issue"
          detail={projectDetail}
          keymapMode="detail"
          runtimeConfig={runtimeConfig}
        />,
      );

      expect(html).toContain('<span class="ybtn ybtn-small">\u2318</span> + <span');
      expect(html).toContain(
        '<span class="ybtn ybtn-small">CTRL</span> + <span class="ybtn ybtn-small">ALT</span> + <span class="ybtn ybtn-small">S</span>',
      );
      expect(html).toContain(
        '<span class="ybtn ybtn-small">SHIFT</span> + <span class="ybtn ybtn-small">\u2318</span> + <span class="ybtn ybtn-small">ENTER</span>',
      );
    });
  });
});
