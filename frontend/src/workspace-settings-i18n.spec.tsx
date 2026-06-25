import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createLegacyI18nRuntime } from "./i18n";
import { renderWorkspaceSettings, testRuntimeConfig } from "./auth-workspace-shell.test-helpers";
import type { WorkspaceOverviewViewModel } from "./routes/-view-models";

const overview: WorkspaceOverviewViewModel = {
  apiToken: "door-token",
  defaultLandingPath: "/me",
  emails: [
    { emailAddress: "alt@example.com", id: "2", valid: true },
    { emailAddress: "pending@example.com", id: "3", valid: false },
  ],
  favoriteProjects: [],
  profile: {
    avatarUrl: "",
    connectedSocialProviders: [],
    displayName: "Door",
    englishName: "",
    isBlocked: false,
    isGuest: false,
    isSiteAdmin: false,
    loginId: "door",
    primaryEmailAddress: "door@example.com",
    sinceLabel: "2026-06-21",
  },
  recentProjects: [],
  session: {
    defaultLandingPath: "/me",
    emailAddress: "door@example.com",
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: false,
    loginId: "door",
    userLabel: "Door",
  },
  watchedProjects: [
    {
      notifications: [{ enabled: true, eventType: "NEW_ISSUE", label: "New issue" }],
      ownerName: "admin",
      projectId: "1",
      projectName: "projectYobi",
    },
  ],
};

describe("workspace settings legacy i18n opt-in", () => {
  it("uses legacy default messages when rendered through direct test helpers", () => {
    const profileHtml = renderWorkspaceSettings("profile", "/user/editform", overview);
    const passwordHtml = renderWorkspaceSettings("password", "/user/editform/password", overview);
    const emailsHtml = renderWorkspaceSettings("emails", "/user/editform/emails", overview);
    const tokenHtml = renderWorkspaceSettings("token", "/user/editform/token", overview);

    expect(profileHtml).toContain("<h3>Account</h3>");
    expect(profileHtml).toContain(">Edit profile</a>");
    expect(profileHtml).toContain(">Login ID</dt>");
    expect(profileHtml).toContain(">Change avatar");
    expect(profileHtml).toContain(">Save</button>");
    expect(profileHtml).not.toContain("userinfo.accountSetting");
    expect(passwordHtml).toContain(">Current password</dt>");
    expect(passwordHtml).toContain(">Password reset request</a>");
    expect(emailsHtml).toContain('placeholder="New E-mail address"');
    expect(emailsHtml).toContain(">Primary email address</span>");
    expect(emailsHtml).toContain(">Set as primary email address.</button>");
    expect(tokenHtml).toContain("<h3>User Token</h3>");
    expect(tokenHtml).toContain(">Recreate User Token</button>");
    expect(passwordHtml).toContain(">New password</dt>");
  });

  it("uses Korean legacy messages for user settings controls when lookup is provided", () => {
    const runtime = createLegacyI18nRuntime(["en-US", "ko-KR"]);
    runtime.setLanguage("ko-KR");

    const profileHtml = renderWorkspaceSettings(
      "profile",
      "/user/editform",
      overview,
      testRuntimeConfig,
      runtime.t,
    );
    const passwordHtml = renderWorkspaceSettings(
      "password",
      "/user/editform/password",
      overview,
      testRuntimeConfig,
      runtime.t,
    );
    const emailsHtml = renderWorkspaceSettings(
      "emails",
      "/user/editform/emails",
      overview,
      testRuntimeConfig,
      runtime.t,
    );
    const tokenHtml = renderWorkspaceSettings(
      "token",
      "/user/editform/token",
      overview,
      testRuntimeConfig,
      runtime.t,
    );

    expect(profileHtml).toContain("<h3>사용자 설정</h3>");
    expect(profileHtml).toContain(">프로필 수정</a>");
    expect(profileHtml).toContain(">아이디</dt>");
    expect(profileHtml).toContain(">아바타 변경");
    expect(profileHtml).toContain(">저장</button>");
    expect(passwordHtml).toContain(">현재 비밀번호</dt>");
    expect(passwordHtml).toContain(">비밀번호 재 설정</a>");
    expect(emailsHtml).toContain('placeholder="새 이메일 주소"');
    expect(emailsHtml).toContain(">대표 이메일</span>");
    expect(emailsHtml).toContain(">대표 이메일로 설정</button>");
    expect(tokenHtml).toContain("<h3>사용자토큰</h3>");
    expect(tokenHtml).toContain(">사용자토큰 다시생성</button>");
    expect(passwordHtml).toContain(">신규 비밀번호</dt>");
  });

  it("looks up workspace settings mutation fallback keys through the runtime messages", () => {
    const routeFiles = [
      ["routes/user/editform/index.tsx", "error.badrequest"],
      ["routes/user/editform/password/route.tsx", "error.badrequest"],
      ["routes/user/editform/emails/route.tsx", "error.badrequest"],
      ["routes/user/editform/token/route.tsx", "error.badrequest"],
      ["routes/user/editform/notifications/route.tsx", "error.failedTo"],
      ["routes/user/editform/notifications/route.tsx", "userinfo.changeNotifications"],
    ];

    for (const [routeFile, key] of routeFiles) {
      const source = fs.readFileSync(path.resolve(__dirname, routeFile), "utf8");
      expect(source).toContain(`messages("${key}", {`);
      expect(source).toContain(`fallback: "${key}"`);
    }
  });
});
