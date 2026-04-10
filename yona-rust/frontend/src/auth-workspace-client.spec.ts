import { describe, expect, it, vi } from "vitest";
import { readSessionBootstrap, resolveCurrentPath } from "./auth-workspace-client";
import type { RuntimeConfig } from "./runtime-config";

const runtimeConfig: RuntimeConfig = {
  apiBaseUrl: "/yona/api",
  basePath: "/yona",
  rpcBaseUrl: "/yona/rpc",
};

describe("readSessionBootstrap", () => {
  it("calls the bootstrap route with credentials and reads csrf from the header", async () => {
    const fetchMock = vi.fn(async () => ({
      headers: new Headers({
        "x-csrf-token": "csrf-123",
      }),
      json: async () => ({
        session: null,
        user: null,
      }),
      ok: true,
      status: 200,
    }));

    const result = await readSessionBootstrap(runtimeConfig, fetchMock as unknown as typeof fetch);

    expect(fetchMock).toHaveBeenCalledWith("/yona/api/auth/session", {
      credentials: "include",
      method: "GET",
    });
    expect(result.csrfToken).toBe("csrf-123");
  });
});

describe("resolveCurrentPath", () => {
  it("maps the canonical auth, home, and workspace shells", () => {
    expect(resolveCurrentPath("/yona")).toEqual({ kind: "public-home", href: "/" });
    expect(resolveCurrentPath("/yona/users/loginform")).toEqual({
      kind: "login",
      href: "/users/loginform",
    });
    expect(resolveCurrentPath("/yona/login")).toEqual({
      kind: "login",
      href: "/users/loginform",
    });
    expect(resolveCurrentPath("/yona/users/signupform")).toEqual({
      kind: "register",
      href: "/users/signupform",
    });
    expect(resolveCurrentPath("/yona/register")).toEqual({
      kind: "register",
      href: "/users/signupform",
    });
    expect(resolveCurrentPath("/yona/lostPassword")).toEqual({
      kind: "lost-password",
      href: "/lostPassword",
    });
    expect(resolveCurrentPath("/yona/forgot-password")).toEqual({
      kind: "lost-password",
      href: "/lostPassword",
    });
    expect(resolveCurrentPath("/yona/resetPassword")).toEqual({
      kind: "reset-password",
      href: "/resetPassword",
    });
    expect(resolveCurrentPath("/yona/reset-password")).toEqual({
      kind: "reset-password",
      href: "/resetPassword",
    });
    expect(resolveCurrentPath("/yona/me")).toEqual({ kind: "me", href: "/me" });
    expect(resolveCurrentPath("/yona/user/editform")).toEqual({
      kind: "workspace-settings",
      href: "/user/editform",
      section: "profile",
    });
    expect(resolveCurrentPath("/yona/user/editform/password")).toEqual({
      kind: "workspace-settings",
      href: "/user/editform/password",
      section: "password",
    });
    expect(resolveCurrentPath("/yona/user/editform/notifications")).toEqual({
      kind: "workspace-settings",
      href: "/user/editform/notifications",
      section: "notifications",
    });
    expect(resolveCurrentPath("/yona/user/editform/emails")).toEqual({
      kind: "workspace-settings",
      href: "/user/editform/emails",
      section: "emails",
    });
    expect(resolveCurrentPath("/yona/user/editform/token")).toEqual({
      kind: "workspace-settings",
      href: "/user/editform/token",
      section: "token",
    });
    expect(resolveCurrentPath("/yona/me/settings/profile")).toEqual({
      kind: "workspace-settings",
      href: "/user/editform",
      section: "profile",
    });
    expect(resolveCurrentPath("/yona/me/settings/password")).toEqual({
      kind: "workspace-settings",
      href: "/user/editform/password",
      section: "password",
    });
    expect(resolveCurrentPath("/yona/me/settings/notifications")).toEqual({
      kind: "workspace-settings",
      href: "/user/editform/notifications",
      section: "notifications",
    });
  });

  it("maps public directory and organization/project baseline routes to internal route objects", () => {
    expect(resolveCurrentPath("/yona/projects?filter=yobi&pageNum=2")).toEqual({
      kind: "public-projects",
      href: "/projects?filter=yobi&pageNum=2",
    });
    expect(resolveCurrentPath("/yona/orgs?filter=lab&pageNum=3")).toEqual({
      kind: "public-organizations",
      href: "/orgs?filter=lab&pageNum=3",
    });
    expect(resolveCurrentPath("/yona/organizations/new")).toEqual({
      kind: "organization-new",
      href: "/organizations/new",
    });
    expect(resolveCurrentPath("/yona/organizations/weblabs")).toEqual({
      kind: "organization-detail",
      href: "/organizations/weblabs",
      organizationName: "weblabs",
    });
    expect(resolveCurrentPath("/yona/organizations/weblabs/settingform")).toEqual({
      kind: "organization-settings",
      href: "/organizations/weblabs/settingform",
      organizationName: "weblabs",
    });
    expect(resolveCurrentPath("/yona/organizations/weblabs/issues?pageNum=2")).toEqual({
      kind: "organization-issues",
      href: "/organizations/weblabs/issues?pageNum=2",
      organizationName: "weblabs",
    });
    expect(resolveCurrentPath("/yona/organizations/weblabs/boards?pageNum=1")).toEqual({
      kind: "organization-boards",
      href: "/organizations/weblabs/boards?pageNum=1",
      organizationName: "weblabs",
    });
    expect(resolveCurrentPath("/yona/organizations/weblabs/pullrequests?category=open")).toEqual({
      kind: "organization-pull-requests",
      href: "/organizations/weblabs/pullrequests?category=open",
      organizationName: "weblabs",
    });
    expect(resolveCurrentPath("/yona/projectform")).toEqual({
      kind: "project-new",
      href: "/projectform",
    });
    expect(resolveCurrentPath("/yona/projects/new")).toEqual({
      kind: "project-new",
      href: "/projectform",
    });
    expect(resolveCurrentPath("/yona/admin/projectYobi")).toEqual({
      kind: "project-detail",
      href: "/admin/projectYobi",
      ownerName: "admin",
      projectName: "projectYobi",
    });
    expect(resolveCurrentPath("/yona/admin/projectYobi/settingform")).toEqual({
      kind: "project-settings",
      href: "/admin/projectYobi/settingform",
      ownerName: "admin",
      projectName: "projectYobi",
    });
    expect(resolveCurrentPath("/yona/admin/projectYobi/issues?pageNum=4")).toEqual({
      kind: "project-issues",
      href: "/admin/projectYobi/issues?pageNum=4",
      ownerName: "admin",
      projectName: "projectYobi",
    });
    expect(resolveCurrentPath("/yona/admin/projectYobi/issue/7")).toEqual({
      kind: "issue-detail",
      href: "/admin/projectYobi/issue/7",
      issueNumber: 7,
      ownerName: "admin",
      projectName: "projectYobi",
    });
    expect(resolveCurrentPath("/yona/admin/projectYobi/posts")).toEqual({
      kind: "project-boards",
      href: "/admin/projectYobi/posts",
      ownerName: "admin",
      projectName: "projectYobi",
    });
    expect(resolveCurrentPath("/yona/admin/projectYobi/post/4")).toEqual({
      kind: "board-detail",
      href: "/admin/projectYobi/post/4",
      ownerName: "admin",
      postNumber: 4,
      projectName: "projectYobi",
    });
    expect(resolveCurrentPath("/yona/admin/projectYobi/code")).toEqual({
      kind: "code-browser",
      href: "/admin/projectYobi/code",
      ownerName: "admin",
      projectName: "projectYobi",
    });
    expect(resolveCurrentPath("/yona/admin/projectYobi/pullRequests")).toEqual({
      kind: "pull-request-list",
      href: "/admin/projectYobi/pullRequests",
      ownerName: "admin",
      projectName: "projectYobi",
    });
    expect(resolveCurrentPath("/yona/admin/projectYobi/pullRequest/3")).toEqual({
      kind: "pull-request-detail",
      href: "/admin/projectYobi/pullRequest/3",
      ownerName: "admin",
      projectName: "projectYobi",
      pullRequestNumber: 3,
    });
    expect(resolveCurrentPath("/yona/search?pageSize=20&scope=global")).toEqual({
      kind: "search",
      href: "/search?pageSize=20&scope=global",
    });
    expect(resolveCurrentPath("/yona/sites/userList?pageNum=2")).toEqual({
      kind: "site-admin",
      href: "/sites/userList?pageNum=2",
      pageName: "userList",
    });
  });
});
