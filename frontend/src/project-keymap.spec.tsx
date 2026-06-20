import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
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
    expect(html).toContain("<h5>title.issueList</h5>");
    expect(html).toContain('<span class="help-inline">issue.menu.new</span>');
    expect(html).toContain('<span class="help-inline">button.prevPage</span>');
    expect(html).toContain('<span class="help-inline">button.nextPage</span>');
    expect(html).toContain('<span class="ybtn ybtn-small">CTRL</span> + <span');
    expect(html).toContain('<span class="ybtn ybtn-small">ALT</span> + <span');
    expect(html).toContain('<span class="help-inline">button.selectAll</span>');
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

    expect(html).toContain("<h5>title.issueDetail</h5>");
    expect(html).toContain('<span class="help-inline">issue.menu.new</span>');
    expect(html).toContain('<span class="help-inline">button.list</span>');
    expect(html).toContain('<span class="help-inline">button.edit</span>');
    expect(html).toContain("<h5>search.menu.issue.comments</h5>");
    expect(html).toContain('<span class="help-inline">button.commentAndNextState.closed</span>');
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
