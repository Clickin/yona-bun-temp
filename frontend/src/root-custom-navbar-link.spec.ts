import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("root custom navbar link parity", () => {
  it("keeps the legacy authenticated custom usermenu link surface wired to runtime config", () => {
    const source = readFileSync(new URL("./routes/__root.tsx", import.meta.url), "utf8");

    expect(source).toContain("navbarCustomLinkName");
    expect(source).toContain("navbarCustomLinkUrl");
    expect(source).toContain("gnb-usermenu");
    expect(source).toContain('className="user-item-btn loggged-in"');
    expect(source).toContain('className="usermenu-icon-button show-progress-bar"');
    expect(source).toContain("sidebar-open-btn");
    expect(source).toContain("dropdwon-box-btn");
    expect(source).toContain("issue.myIssue");
    expect(source).toContain("issue.menu.new.mine");
    expect(source).toContain("currentSession.isSiteAdmin");
    expect(source).toContain('prefixBasePath(runtimeConfig.basePath, "/sites/userList")');
    expect(source).toContain("currentSession.isAnonymous");
  });
});
