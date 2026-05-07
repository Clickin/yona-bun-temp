import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildProfileUpdateInput,
  createDefaultAvatarCrop,
  drawAvatarCropToCanvas,
  getAvatarCropPreviewStyle,
} from "./routes/-workspace-settings-view";
import { resolveAuthRedirectPath, resolvePostAuthHref } from "./routes/-auth-views";
import {
  renderHome,
  renderLogin,
  renderLostPassword,
  renderOrganizationDetail,
  renderOrganizationDirectory,
  renderProjectDetail,
  renderProjectDirectory,
  renderRegister,
  renderResetPassword,
  renderVerifyUser,
  renderWorkspace,
  renderWorkspaceSettings,
} from "./auth-workspace-shell.test-helpers";
import {
  ISSUE_ASSIGNEE_SEARCH_DEBOUNCE_MS,
  IssueAssignableUserSuggestions,
  ProjectIssueDetailPage,
  shouldSearchIssueAssignee,
  submitIssueAssigneeSuggestion,
  submitIssueAssigneeText,
} from "./routes/-issue-views";
import type { ProjectIssueDetailViewModel } from "./routes/-view-models";

describe("auth and workspace views", () => {
  it("renders the canonical login shell with legacy field names and recovery link", () => {
    const html = renderLogin({
      routeHref: "/users/loginform?redirectUrl=/admin/projectYobi/issue/1",
    });

    expect(html).toContain("Login for Yona");
    expect(html).toContain('name="loginIdOrEmail"');
    expect(html).toContain('placeholder="Login ID or email"');
    expect(html).toContain('name="password"');
    expect(html).toContain('name="rememberMe"');
    expect(html).toContain('method="post"');
    expect(html).toContain('action="/yona/users/login"');
    expect(html).toContain('name="redirectUrl"');
    expect(html).toContain('value="/admin/projectYobi/issue/1"');
    expect(html).toContain(">Login<");
    expect(html).toContain('href="/yona/lostPassword"');
  });

  it("renders the canonical signup shell with legacy labels and login link", () => {
    const html = renderRegister({
      authUiCapabilities: {
        emailVerificationEnabled: false,
        signupRequireConfirm: false,
        socialLoginOnly: false,
      },
    });

    expect(html).toContain("Sign Up for Yona");
    expect(html).toContain(">Login ID<");
    expect(html).toContain('name="loginId"');
    expect(html).toContain(">Name<");
    expect(html).toContain('name="name"');
    expect(html).toContain(">Email<");
    expect(html).toContain('name="emailAddress"');
    expect(html).toContain(">Password<");
    expect(html).toContain('name="password"');
    expect(html).toContain(">Retype password<");
    expect(html).toContain('name="retypedPassword"');
    expect(html).toContain('method="post"');
    expect(html).toContain('action="/yona/users/signup"');
    expect(html).toContain(">Sign up<");
    expect(html).toContain('href="/yona/users/loginform"');
  });

  it("renders lost-password and reset-password shells with legacy field layout", () => {
    const lostPasswordHtml = renderLostPassword("/lostPassword");
    expect(lostPasswordHtml).toContain("Reset Password for Yona");
    expect(lostPasswordHtml).toContain('action="/yona/lostPassword"');
    expect(lostPasswordHtml).toContain('name="loginId"');
    expect(lostPasswordHtml).toContain('name="emailAddress"');
    expect(lostPasswordHtml).toContain(">Confirm<");

    const resetPasswordHtml = renderResetPassword("/resetPassword");
    expect(resetPasswordHtml).toContain("Reset Password for Yona");
    expect(resetPasswordHtml).toContain('action="/yona/resetPassword"');
    expect(resetPasswordHtml).toContain('name="password"');
    expect(resetPasswordHtml).toContain('name="retypedPassword"');
    expect(resetPasswordHtml).toContain(">Confirm<");
  });

  it("renders auth capability help copy when email verification or signup confirmation is enabled", () => {
    const loginHtml = renderLogin({
      authUiCapabilities: {
        emailVerificationEnabled: true,
        signupRequireConfirm: false,
        socialLoginOnly: false,
      },
      routeHref: "/users/loginform",
    });
    expect(loginHtml).toContain("Email verification is required");

    const registerHtml = renderRegister({
      authUiCapabilities: {
        emailVerificationEnabled: false,
        signupRequireConfirm: true,
        socialLoginOnly: false,
      },
    });
    expect(registerHtml).toContain("Sign up requires confirmation");
  });

  it("renders login-side post-submit messages from auth query parameters", () => {
    const verifyHtml = renderLogin({ routeHref: "/users/loginform?verify=sent" });
    expect(verifyHtml).toContain("Confirmation request was accepted.");

    const requestedHtml = renderLogin({ routeHref: "/users/loginform?signup=requested" });
    expect(requestedHtml).toContain("Sign up requires confirmation.");
  });

  it("renders verify-user success and invalid surfaces", () => {
    const successHtml = renderVerifyUser({ loginId: "door" });
    expect(successHtml).toContain("Verified User");
    expect(successHtml).toContain("door");
    expect(successHtml).toContain("User is verified. Try logging in.");
    expect(successHtml).toContain('href="/yona/users/loginform"');

    const invalidHtml = renderVerifyUser({ invalid: true, loginId: "door" });
    expect(invalidHtml).toContain("Invalid verification");
    expect(invalidHtml).toContain("door");
    expect(invalidHtml).toContain('href="/yona/users/loginform"');
  });

  it("hides local auth forms when social-login-only mode is enabled", () => {
    const loginHtml = renderLogin({
      authUiCapabilities: {
        emailVerificationEnabled: false,
        signupRequireConfirm: false,
        socialLoginOnly: true,
      },
      routeHref: "/users/loginform",
    });
    expect(loginHtml).toContain("Social login only");
    expect(loginHtml).not.toContain('name="loginIdOrEmail"');
    expect(loginHtml).not.toContain('name="password"');

    const registerHtml = renderRegister({
      authUiCapabilities: {
        emailVerificationEnabled: false,
        signupRequireConfirm: false,
        socialLoginOnly: true,
      },
    });
    expect(registerHtml).toContain("Social login only");
    expect(registerHtml).not.toContain('name="loginId"');
    expect(registerHtml).not.toContain('name="emailAddress"');
    expect(registerHtml).not.toContain('name="password"');
  });

  it("does not render local auth forms before auth capabilities resolve", () => {
    const loginHtml = renderLogin({
      authUiCapabilities: null,
      routeHref: "/users/loginform",
    });

    expect(loginHtml).not.toContain('name="loginIdOrEmail"');
    expect(loginHtml).not.toContain('name="password"');
  });

  it("renders the /me shell with default landing and workspace lists", () => {
    const html = renderWorkspace({
      defaultLandingPath: "/me",
      favoriteProjects: [{ ownerName: "admin", projectName: "projectYobi" }],
      recentProjects: [{ ownerName: "admin", projectName: "projectYobi" }],
      session: {
        defaultLandingPath: "/me",
        emailAddress: "door@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: false,
        loginId: "door",
        userLabel: "Door",
      },
    });

    expect(html).toContain("door");
    expect(html).toContain("admin");
    expect(html).toContain("projectYobi");
  });

  it("renders the public landing and directory views", () => {
    const homeHtml = renderHome();
    expect(homeHtml).toContain("Yona Rust Frontend");
    expect(homeHtml).toContain('href="/yona/users/loginform"');
    expect(homeHtml).toContain('href="/yona/users/signupform"');
    expect(homeHtml).toContain('href="/yona/projects"');
    expect(homeHtml).toContain('href="/yona/orgs"');

    const projectsHtml = renderProjectDirectory(
      {
        items: [
          {
            overview: "Yona project",
            ownerName: "yobi",
            projectName: "projectYobi",
            projectScope: "public",
          },
        ],
      },
      "/projects?filter=yobi&pageNum=1",
    );

    expect(projectsHtml).toContain("Project List");
    expect(projectsHtml).toContain('action="/yona/projects"');
    expect(projectsHtml).toContain("projectYobi");
    expect(projectsHtml).toContain("yobi");

    const organizationsHtml = renderOrganizationDirectory(
      {
        items: [
          {
            description: "web labs",
            organizationName: "weblabs",
          },
        ],
      },
      "/orgs?filter=lab&pageNum=1",
    );

    expect(organizationsHtml).toContain("Organization List");
    expect(organizationsHtml).toContain('action="/yona/orgs"');
    expect(organizationsHtml).toContain("weblabs");
    expect(organizationsHtml).toContain("web labs");
  });

  it("renders organization and project baseline views", () => {
    const orgHtml = renderOrganizationDetail({
      description: "web labs",
      organizationName: "weblabs",
      viewerCanUpdate: true,
    });
    expect(orgHtml).toContain("weblabs");
    expect(orgHtml).toContain("web labs");

    const projectHtml = renderProjectDetail({
      enrollmentRequested: false,
      isFavorited: false,
      organizationName: "",
      overview: "Yona",
      ownerName: "admin",
      projectName: "projectYobi",
      projectScope: "public",
      viewerCanEnroll: true,
      viewerCanUpdate: false,
    });
    expect(projectHtml).toContain("admin/projectYobi");
    expect(projectHtml).toContain("Request enrollment");
    expect(projectHtml).toContain("Favorite project");
  });

  it("renders workspace settings tabs with canonical legacy user-editform paths", () => {
    const html = renderWorkspaceSettings("password", "/user/editform/password", {
      defaultLandingPath: "/me",
      favoriteProjects: [],
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
    });

    expect(html).toContain('href="/yona/user/editform"');
    expect(html).toContain('href="/yona/user/editform/password"');
    expect(html).toContain('href="/yona/user/editform/notifications"');
    expect(html).toContain('href="/yona/user/editform/emails"');
    expect(html).toContain('href="/yona/user/editform/token"');
    expect(html).toContain('action="/yona/user/resetPassword"');
    expect(html).toContain('name="oldPassword"');
    expect(html).toContain('name="loginId"');
    expect(html).toContain('href="/yona/lostPassword"');
    expect(html).toContain("Change Password");
  });

  it("prefers profile.avatarUrl on /me and profile settings before placeholder fallback", () => {
    const withAvatarHtml = renderWorkspace({
      defaultLandingPath: "/me",
      favoriteProjects: [],
      recentProjects: [],
      profile: {
        avatarUrl: "https://cdn.yona/avatar-door.png",
        connectedSocialProviders: [],
        displayName: "Door",
        englishName: "",
        isBlocked: false,
        isSiteAdmin: false,
        loginId: "door",
        primaryEmailAddress: "door@example.com",
        sinceLabel: "",
      },
      session: {
        defaultLandingPath: "/me",
        emailAddress: "door@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: false,
        loginId: "door",
        userLabel: "Door",
      },
    });
    expect(withAvatarHtml).toContain("https://cdn.yona/avatar-door.png");

    const settingsWithAvatarHtml = renderWorkspaceSettings("profile", "/user/editform", {
      defaultLandingPath: "/me",
      favoriteProjects: [],
      profile: {
        avatarUrl: "https://cdn.yona/avatar-door.png",
        connectedSocialProviders: [],
        displayName: "Door",
        englishName: "",
        isBlocked: false,
        isSiteAdmin: false,
        loginId: "door",
        primaryEmailAddress: "door@example.com",
        sinceLabel: "",
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
    });
    expect(settingsWithAvatarHtml).toContain("https://cdn.yona/avatar-door.png");

    const fallbackHtml = renderWorkspaceSettings("profile", "/user/editform", {
      defaultLandingPath: "/me",
      favoriteProjects: [],
      profile: {
        avatarUrl: "",
        connectedSocialProviders: [],
        displayName: "Door",
        englishName: "",
        isBlocked: false,
        isSiteAdmin: false,
        loginId: "door",
        primaryEmailAddress: "door@example.com",
        sinceLabel: "",
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
    });
    expect(fallbackHtml).toContain("data:image/svg+xml;utf8,");
  });

  it("builds updateProfile input with avatarAttachmentId", () => {
    const formData = new FormData();
    formData.set("email", "door@example.com");
    formData.set("name", "Door");

    expect(buildProfileUpdateInput(formData, "avatar-attachment-1")).toEqual({
      avatarAttachmentId: "avatar-attachment-1",
      email: "door@example.com",
      name: "Door",
    });
  });

  it("renders the avatar uploader shell and crop modal in profile settings", () => {
    const html = renderWorkspaceSettings("profile", "/user/editform", {
      defaultLandingPath: "/me",
      favoriteProjects: [],
      profile: {
        avatarUrl: "",
        connectedSocialProviders: [],
        displayName: "Door",
        englishName: "",
        isBlocked: false,
        isSiteAdmin: false,
        loginId: "door",
        primaryEmailAddress: "door@example.com",
        sinceLabel: "",
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
    });

    expect(html).toContain("Change avatar");
    expect(html).toContain('name="avatarAttachmentId"');
    expect(html).toContain("Crop Avatar");
    expect(html).toContain("Cancel");
    expect(html).toContain("Save");
  });

  it("renders issue sharer list and manager controls in the issue sidebar", () => {
    const html = renderIssueDetailPage(
      {
        viewerCanComment: true,
        viewerCanDelete: true,
        viewerCanManageSharers: true,
        viewerCanUpdate: true,
      },
      {
        onShareIssue: async () => undefined,
        onUnshareIssue: async () => undefined,
      },
    );

    expect(html).toContain("Issue Sharer");
    expect(html).toContain("Guest User");
    expect(html).toContain('name="issueSharer"');
    expect(html).toContain('placeholder="Issue sharer login ID"');
    expect(html).toContain(">Share<");
    expect(html).toContain(">Remove sharer<");
  });

  it("renders issue assignee autocomplete loading, empty, error, and suggestion states", () => {
    expect(ISSUE_ASSIGNEE_SEARCH_DEBOUNCE_MS).toBe(300);

    const loadingHtml = renderToStaticMarkup(
      <IssueAssignableUserSuggestions
        onSelect={() => undefined}
        state={{ items: [], status: "loading", truncated: false }}
      />,
    );
    expect(loadingHtml).toContain("Searching...");

    const emptyHtml = renderToStaticMarkup(
      <IssueAssignableUserSuggestions
        onSelect={() => undefined}
        state={{ items: [], status: "loaded", truncated: false }}
      />,
    );
    expect(emptyHtml).toContain("No matching users");

    const errorHtml = renderToStaticMarkup(
      <IssueAssignableUserSuggestions
        onSelect={() => undefined}
        state={{ items: [], status: "error", truncated: false }}
      />,
    );
    expect(errorHtml).toContain("Assignable user search failed.");

    const suggestionHtml = renderToStaticMarkup(
      <IssueAssignableUserSuggestions
        onSelect={() => undefined}
        state={{
          items: [
            {
              avatarUrl: "/avatars/door.png",
              displayName: "Door User",
              loginId: "door",
              pureNameOnly: "Door",
              type: "user",
            },
          ],
          status: "loaded",
          truncated: true,
        }}
      />,
    );
    expect(suggestionHtml).toContain("Door User");
    expect(suggestionHtml).toContain("@door");
    expect(suggestionHtml).toContain("More matches available");
  });

  it("keeps assignee suggestion selection, manual assign, and blank unassign on the existing submit flow", async () => {
    const assigned: string[] = [];
    const onSubmit = async (loginId: string) => {
      assigned.push(loginId);
    };

    await submitIssueAssigneeSuggestion(
      {
        avatarUrl: "",
        displayName: "Guest User",
        loginId: "guest",
        pureNameOnly: "Guest",
        type: "user",
      },
      onSubmit,
    );
    await submitIssueAssigneeText("  member  ", onSubmit);
    await submitIssueAssigneeText("   ", onSubmit);

    expect(assigned).toEqual(["guest", "member", ""]);
    expect(shouldSearchIssueAssignee("")).toBe(false);
    expect(shouldSearchIssueAssignee("   ")).toBe(false);
    expect(shouldSearchIssueAssignee("do")).toBe(true);
  });

  it("keeps shared issue viewers on read/comment controls without issue mutation controls", () => {
    const html = renderIssueDetailPage(
      {
        viewerCanComment: true,
        viewerCanDelete: false,
        viewerCanManageSharers: false,
        viewerCanUpdate: false,
      },
      {
        onCommentSubmit: async () => undefined,
      },
    );

    expect(html).toContain("Issue Sharer");
    expect(html).toContain("Guest User");
    expect(html).toContain('placeholder="Leave a comment"');
    expect(html).not.toContain(">Edit<");
    expect(html).not.toContain(">Close<");
    expect(html).not.toContain(">Assign<");
    expect(html).not.toContain(">Delete<");
  });

  it("renders the legacy favorite issue star beside the issue title", () => {
    const html = renderIssueDetailPage(
      {
        isFavorited: true,
        viewerCanComment: true,
      },
      {
        onFavoriteToggle: async () => undefined,
      },
    );

    expect(html).toContain("Shared issue");
    expect(html).toContain("favorite-issue");
    expect(html).toContain("starred");
    expect(html).toContain('aria-label="Unfavorite issue"');
  });

  it("renders issue comment agreement count, voters, and agree action", () => {
    const html = renderIssueDetailPage(
      {
        viewerCanComment: true,
        timeline: [
          {
            comment: {
              authorLabel: "Owner User",
              contentsHtml: "<p>Useful comment</p>",
              contentsMarkdown: "Useful comment",
              createdLabel: "now",
              id: 10,
              viewerCanDelete: false,
              viewerCanUpdate: false,
              viewerHasVoted: false,
              voterCount: 2,
              voters: [
                {
                  avatarUrl: "https://cdn.yona/avatar-guest.png",
                  loginId: "guest",
                  userId: 2,
                  userLabel: "Guest User",
                },
              ],
            },
            createdLabel: "now",
            eventType: "",
            id: 10,
            kind: "comment",
          },
        ],
      },
      {
        onCommentVoteToggle: async () => undefined,
      },
    );

    expect(html).toContain("2 Agreements");
    expect(html).toContain("Guest User");
    expect(html).toContain("comment-vote");
    expect(html).toContain('aria-label="Agree with comment"');
    expect(html).toContain("vote-heart-off");
  });

  it("renders voted issue comment state as withdraw action", () => {
    const html = renderIssueDetailPage(
      {
        viewerCanComment: true,
        timeline: [
          {
            comment: {
              authorLabel: "Owner User",
              contentsHtml: "<p>Already agreed</p>",
              contentsMarkdown: "Already agreed",
              createdLabel: "now",
              id: 11,
              viewerCanDelete: false,
              viewerCanUpdate: false,
              viewerHasVoted: true,
              voterCount: 1,
              voters: [
                {
                  avatarUrl: "https://cdn.yona/avatar-door.png",
                  loginId: "door",
                  userId: 3,
                  userLabel: "Door User",
                },
              ],
            },
            createdLabel: "now",
            eventType: "",
            id: 11,
            kind: "comment",
          },
        ],
      },
      {
        onCommentVoteToggle: async () => undefined,
      },
    );

    expect(html).toContain("1 Agreement");
    expect(html).toContain('aria-label="Withdraw comment agreement"');
    expect(html).toContain("vote-heart-on");
  });

  it("creates centered avatar crop defaults and preview styles", () => {
    const crop = createDefaultAvatarCrop(640, 480);
    expect(crop).toEqual({
      size: 480,
      x: 80,
      y: 0,
    });

    expect(getAvatarCropPreviewStyle(crop, 640, 480)).toEqual({
      height: "128px",
      marginLeft: "-21px",
      marginTop: "0px",
      width: "171px",
    });
  });

  it("draws the selected avatar crop into a 128px canvas", () => {
    const drawImage = vi.fn();
    const canvas = {
      getContext: vi.fn(() => ({
        clearRect: vi.fn(),
        drawImage,
      })),
      height: 128,
      width: 128,
    } as unknown as HTMLCanvasElement;
    const image = {
      naturalHeight: 480,
      naturalWidth: 640,
    } as HTMLImageElement;

    drawAvatarCropToCanvas(canvas, image, {
      size: 480,
      x: 80,
      y: 0,
    });

    expect(drawImage).toHaveBeenCalledWith(image, 80, 0, 480, 480, 0, 0, 128, 128);
  });
});

function renderIssueDetailPage(
  overrides: Partial<ProjectIssueDetailViewModel> & {
    viewerCanManageSharers?: boolean;
  },
  extraProps: Record<string, unknown> = {},
) {
  const issue = {
    assigneeLabel: "",
    assigneeLoginId: "",
    attachments: [],
    authorLabel: "Owner User",
    bodyHtml: "<p>Body</p>",
    bodyMarkdown: "Body",
    commentCount: 0,
    comments: [],
    hasVoted: false,
    isFavorited: false,
    isWatching: false,
    issueNumber: 1,
    labels: [],
    milestoneTitle: "",
    ownerName: "owner",
    projectName: "projectYobi",
    sharers: [{ loginId: "guest", userId: 2, userLabel: "Guest User" }],
    state: "open",
    timeline: [],
    title: "Shared issue",
    viewerCanComment: false,
    viewerCanDelete: false,
    viewerCanManageSharers: false,
    viewerCanUpdate: false,
    voterCount: 0,
    watcherCount: 0,
    ...overrides,
  } as unknown as ProjectIssueDetailViewModel;

  return renderToStaticMarkup(
    React.createElement(ProjectIssueDetailPage, {
      detail: {
        enrollmentRequested: false,
        isFavorited: false,
        organizationName: "",
        overview: "",
        ownerName: "owner",
        projectName: "projectYobi",
        projectScope: "private",
        viewerCanEnroll: false,
        viewerCanUpdate: true,
      },
      issue,
      runtimeConfig: { apiBaseUrl: "/yona/api", basePath: "/yona" },
      ...extraProps,
    }),
  );
}

describe("resolvePostAuthHref", () => {
  it("prefers redirect query, then saved default landing, then /me", () => {
    expect(resolvePostAuthHref("/owner/project/pulls/1", "/search?pageSize=20&scope=global")).toBe(
      "/owner/project/pulls/1",
    );
    expect(resolvePostAuthHref(null, "/search?pageSize=20&scope=global")).toBe(
      "/search?pageSize=20&scope=global",
    );
    expect(resolvePostAuthHref(null, null)).toBe("/me");
  });
});

describe("resolveAuthRedirectPath", () => {
  it("prefers redirectUrl, then redirect, then null", () => {
    expect(resolveAuthRedirectPath(new URLSearchParams("redirectUrl=%2Fadmin%2FprojectYobi"))).toBe(
      "/admin/projectYobi",
    );
    expect(
      resolveAuthRedirectPath(new URLSearchParams("redirect=%2Fsearch%3Fscope%3Dglobal")),
    ).toBe("/search?scope=global");
    expect(resolveAuthRedirectPath(new URLSearchParams(""))).toBeNull();
  });

  it("rejects external or protocol-relative redirect targets", () => {
    expect(
      resolveAuthRedirectPath(new URLSearchParams("redirectUrl=https%3A%2F%2Fevil.example")),
    ).toBeNull();
    expect(
      resolveAuthRedirectPath(new URLSearchParams("redirectUrl=%2F%2Fevil.example")),
    ).toBeNull();
  });
});
