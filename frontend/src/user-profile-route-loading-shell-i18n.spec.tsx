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

    const meRouteSource = fs.readFileSync(path.resolve(__dirname, "routes/me/route.tsx"), "utf8");
    expect(meRouteSource).toContain("useRouterState");
    expect(meRouteSource).not.toContain("window.location.pathname");

    const notificationSource = fs.readFileSync(
      path.resolve(__dirname, "routes/notification/route.tsx"),
      "utf8",
    );
    expect(notificationSource).toContain('className="warning-none"');
    expect(notificationSource).not.toContain('<div className="warning-none">common.loading</div>');

    const userRouteSource = fs.readFileSync(
      path.resolve(__dirname, "routes/$user/route.tsx"),
      "utf8",
    );
    expect(userRouteSource).toContain("RedirectPage");
    expect(userRouteSource).not.toContain("navigateToAppHref");

    const userFilesSource = fs.readFileSync(
      path.resolve(__dirname, "routes/user/files/route.tsx"),
      "utf8",
    );
    expect(userFilesSource).toContain("useRouterState");
    expect(userFilesSource).not.toContain("window.location.search");
  });

  it("renders the shared redirect loading shell through legacy messages", () => {
    const fallbackHtml = renderToStaticMarkup(<RedirectPage basePath="/yona" to="/projectform" />);
    const koreanHtml = renderToStaticMarkup(
      <LegacyI18nProvider supportedLanguages={["ko-KR"]}>
        <RedirectPage basePath="/yona" to="/projectform" />
      </LegacyI18nProvider>,
    );

    expect(fallbackHtml).toContain("<h1>Loading</h1>");
    expect(fallbackHtml).not.toContain("<h1>common.loading</h1>");
    expect(koreanHtml).toContain("<h1>불러오는 중</h1>");
    expect(koreanHtml).not.toContain("<h1>common.loading</h1>");

    const sharedSource = fs.readFileSync(path.resolve(__dirname, "routes/-shared.tsx"), "utf8");
    expect(sharedSource).toContain("const navigate = useNavigate();");
    expect(sharedSource).toContain("useRouterState");
    expect(sharedSource).not.toContain("window.location.pathname");
    expect(sharedSource).not.toContain("window.location.search");
    expect(sharedSource).toContain("replace: true");
    expect(sharedSource).not.toContain("window.location.replace(");
  });
});
