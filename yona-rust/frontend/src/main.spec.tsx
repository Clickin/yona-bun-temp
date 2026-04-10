import { describe, expect, it } from "vitest";
import {
  createApp,
  resolveNavigationTarget,
  resolveNavigationTargetWithBasePath,
} from "./main";

describe("createApp", () => {
  it("exposes normalized runtime config for the bootstrap entry", () => {
    const app = createApp({
      runtimeConfig: {
        apiBaseUrl: "/yona/api",
        basePath: "/yona",
        rpcBaseUrl: "/yona/rpc",
      },
    });

    expect(app.runtimeConfig.basePath).toBe("/yona");
    expect(app.title).toBe("Yona Rust Frontend");
  });
});

describe("resolveNavigationTarget", () => {
  it("keeps canonical auth, public directory, and legacy deep links internal", () => {
    expect(resolveNavigationTarget("/")).toEqual({
      mode: "internal",
      route: { kind: "public-home", href: "/" },
    });
    expect(resolveNavigationTarget("/users/loginform")).toEqual({
      mode: "internal",
      route: { kind: "login", href: "/users/loginform" },
    });
    expect(resolveNavigationTarget("/me")).toEqual({
      mode: "internal",
      route: { kind: "me", href: "/me" },
    });
    expect(resolveNavigationTarget("/user/editform")).toEqual({
      mode: "internal",
      route: {
        kind: "workspace-settings",
        href: "/user/editform",
        section: "profile",
      },
    });
    expect(resolveNavigationTarget("/projects?filter=yobi&pageNum=2")).toEqual({
      mode: "internal",
      route: { kind: "public-projects", href: "/projects?filter=yobi&pageNum=2" },
    });
    expect(resolveNavigationTarget("/orgs?filter=lab&pageNum=2")).toEqual({
      mode: "internal",
      route: { kind: "public-organizations", href: "/orgs?filter=lab&pageNum=2" },
    });
    expect(resolveNavigationTarget("/organizations/weblabs")).toEqual({
      mode: "internal",
      route: {
        kind: "organization-detail",
        href: "/organizations/weblabs",
        organizationName: "weblabs",
      },
    });
    expect(resolveNavigationTarget("/admin/projectYobi/issue/7")).toEqual({
      mode: "internal",
      route: {
        kind: "issue-detail",
        href: "/admin/projectYobi/issue/7",
        issueNumber: 7,
        ownerName: "admin",
        projectName: "projectYobi",
      },
    });
    expect(resolveNavigationTarget("/admin/projectYobi/pullRequest/3")).toEqual({
      mode: "internal",
      route: {
        kind: "pull-request-detail",
        href: "/admin/projectYobi/pullRequest/3",
        ownerName: "admin",
        projectName: "projectYobi",
        pullRequestNumber: 3,
      },
    });
    expect(resolveNavigationTarget("/sites/userList?pageNum=2")).toEqual({
      mode: "internal",
      route: {
        kind: "site-admin",
        href: "/sites/userList?pageNum=2",
        pageName: "userList",
      },
    });
    expect(resolveNavigationTarget("https://example.com/outside")).toEqual({
      href: "https://example.com/outside",
      mode: "external",
    });
  });

  it("keeps mounted base-path URLs internal without dropping the base path", () => {
    expect(resolveNavigationTargetWithBasePath("/acme/users/loginform", "/acme")).toEqual({
      mode: "internal",
      route: { kind: "login", href: "/users/loginform" },
    });
    expect(resolveNavigationTargetWithBasePath("/acme/projects?pageNum=2", "/acme")).toEqual({
      mode: "internal",
      route: { kind: "public-projects", href: "/projects?pageNum=2" },
    });
    expect(resolveNavigationTargetWithBasePath("/acme/user/editform/password", "/acme")).toEqual({
      mode: "internal",
      route: {
        kind: "workspace-settings",
        href: "/user/editform/password",
        section: "password",
      },
    });
  });
});
