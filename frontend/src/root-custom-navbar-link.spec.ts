import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("root custom navbar link parity", () => {
  it("keeps the legacy authenticated custom usermenu link surface wired to runtime config", () => {
    const source = readFileSync(new URL("./routes/__root.tsx", import.meta.url), "utf8");

    expect(source).toContain("navbarCustomLinkName");
    expect(source).toContain("navbarCustomLinkUrl");
    expect(source).toContain("gnb-usermenu");
    expect(source).toContain('className="user-item-btn loggged-in"');
    expect(source).toContain("admin-logged-in-affix");
    expect(source).toContain("currentSession.isSiteAdmin");
    expect(source).toContain('prefixBasePath(runtimeConfig.basePath, "/sites/userList")');
    expect(source).toContain("currentSession.isAnonymous");
  });
});
