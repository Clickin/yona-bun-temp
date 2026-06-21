import fs from "node:fs";
import path from "node:path";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LegacyI18nProvider } from "./i18n";
import { RedirectPage } from "./routes/-shared";

describe("route loading shell legacy i18n opt-in", () => {
  it("opts remaining public/user/auth/import/notification/new-project/org/fork shells into legacy messages", () => {
    const routePaths = [
      "routes/-shared.tsx",
      "routes/me/route.tsx",
      "routes/$user/route.tsx",
      "routes/notification/route.tsx",
      "routes/projects/new/route.tsx",
      "routes/projectform/route.tsx",
      "routes/organizations/new/route.tsx",
      "routes/[_]import/route.tsx",
      "routes/restricted/route.tsx",
      "routes/users/loginform/route.tsx",
      "routes/users/signupform/route.tsx",
      "routes/user/issues/route.tsx",
      "routes/user/issues/new/route.tsx",
      "routes/user/files/route.tsx",
      "routes/user/editform/index.tsx",
      "routes/user/editform/password/route.tsx",
      "routes/user/editform/emails/route.tsx",
      "routes/user/editform/notifications/route.tsx",
      "routes/user/editform/token/route.tsx",
      "routes/$owner/$projectName/newFork/route.tsx",
    ];

    for (const routePath of routePaths) {
      const source = fs.readFileSync(path.resolve(__dirname, routePath), "utf8");

      expect(source).toContain('"common.loading", { fallback: "common.loading" }');
      expect(source).not.toContain("<h1>common.loading</h1>");
    }

    const notificationSource = fs.readFileSync(
      path.resolve(__dirname, "routes/notification/route.tsx"),
      "utf8",
    );
    expect(notificationSource).toContain('className="warning-none"');
    expect(notificationSource).not.toContain('<div className="warning-none">common.loading</div>');
  });

  it("renders the shared redirect loading shell through legacy messages with exact fallback", () => {
    const fallbackHtml = renderToStaticMarkup(<RedirectPage basePath="/yona" to="/projectform" />);
    const koreanHtml = renderToStaticMarkup(
      <LegacyI18nProvider supportedLanguages={["ko-KR"]}>
        <RedirectPage basePath="/yona" to="/projectform" />
      </LegacyI18nProvider>,
    );

    expect(fallbackHtml).toContain("<h1>common.loading</h1>");
    expect(koreanHtml).toContain("<h1>불러오는 중</h1>");
    expect(koreanHtml).not.toContain("<h1>common.loading</h1>");
  });
});
