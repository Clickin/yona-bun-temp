import { readFileSync } from "node:fs";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  LegacyI18nProvider,
  createLegacyI18nRuntime,
  lookupLegacyDefaultMessage,
  lookupLegacyMessage,
  normalizeLegacyLanguageCode,
  normalizeSupportedLanguages,
  resolveInitialLanguage,
} from "./i18n";
import { LoginPage } from "./routes/-auth-views";
import { BadRequestPage, ForbiddenPage, NotFoundPage } from "./routes/-shared";

describe("legacy i18n runtime", () => {
  it("does not keep a local fallback dictionary outside legacy message files", () => {
    const source = readFileSync(new URL("./i18n.tsx", import.meta.url), "utf8");

    expect(source).toContain("import legacyMessagesEn");
    expect(source).toContain(
      "const LEGACY_MESSAGES: Record<LegacyLanguageCode, LegacyMessageDictionary> = {",
    );
    expect(source).not.toContain('"app.description":');
    expect(source).not.toContain('"button.login": "Log in"');
    expect(source).not.toContain("LEGACY_SOURCE_MESSAGES");
  });

  it("normalizes supported legacy languages and ignores unsupported dictionaries", () => {
    expect(normalizeLegacyLanguageCode("ko_kr")).toBe("ko-KR");
    expect(normalizeLegacyLanguageCode("EN")).toBe("en-US");
    expect(normalizeLegacyLanguageCode("fr-FR")).toBeNull();
    expect(normalizeSupportedLanguages(" ko-kr, EN_us, fr-FR, ja ")).toEqual([
      "ko-KR",
      "en-US",
      "ja-JP",
    ]);
  });

  it("switches language state at runtime while keeping unsupported switches bounded", () => {
    const runtime = createLegacyI18nRuntime(["en-US", "ko-KR"]);

    expect(runtime.language).toBe("en-US");
    expect(runtime.t("button.login")).toBe("Log in");

    runtime.setLanguage("ko_kr");

    expect(runtime.language).toBe("ko-KR");
    expect(runtime.t("button.login")).toBe("로그인");
    expect(runtime.t("button.add.checklist")).toBe("체크리스트 추가");
    expect(runtime.t("button.draft.save")).toBe("초안으로 저장");
    expect(runtime.t("error.badrequest")).toBe("잘못된 요청입니다");
    expect(runtime.t("error.forbidden.or.not.allowed")).toBe(
      "권한이 없거나 허용하지 않는 요청입니다.",
    );
    expect(runtime.t("issue.option")).toBe("이슈 옵션");
    expect(runtime.t("issue.sharer")).toBe("이슈 공유");
    expect(runtime.t("issue.sharer.select")).toBe("이슈 공유 대상 선택");
    expect(runtime.t("notification.send.mail")).toBe("수정 알림 메일 발송");
    expect(runtime.t("project.name.alert")).toBe(
      "영문, 한글, 숫자 및 일부 기호(_-.)만 사용할 수 있습니다",
    );
    expect(runtime.t("project.new.vcsType.subversion")).toBe("Subversion");
    expect(runtime.t("title.pullrequest")).toBe("title.pullrequest");
    expect(runtime.t("user.verification")).toBe("사용자 정보 확인");
    expect(runtime.t("menu.home")).toBe("홈");
    expect(runtime.t("user.login.failed.network")).toBe(
      "네트워크 문제로 인해 로그인에 실패하였습니다.\\n관리자에게 문의해주세요.",
    );
    expect(runtime.t("title.loginFor", { args: ["Yona"] })).toBe(
      '<span class="highlight">Yona</span> 로그인',
    );

    runtime.setLanguage("ru-RU");

    expect(runtime.language).toBe("ko-KR");
    expect(runtime.t("missing.legacy.key", { fallback: "missing.legacy.key" })).toBe(
      "missing.legacy.key",
    );
  });

  it("uses legacy default messages for auth title fallbacks without hardcoded templates", () => {
    expect(lookupLegacyDefaultMessage("title.loginFor")).toBe(
      'Log in to <span class="highlight">{0}</span>',
    );
    expect(lookupLegacyDefaultMessage("title.signupFor")).toBe(
      'Sign up for <span class="highlight">{0}</span>',
    );
    expect(lookupLegacyDefaultMessage("title.resetPasswordFor")).toBe(
      'Reset password for <span class="highlight">{0}</span>',
    );

    const authSource = readFileSync(`${__dirname}/routes/-auth-views.tsx`, "utf8");
    expect(authSource).toContain('lookupLegacyDefaultMessage("title.loginFor")');
    expect(authSource).toContain('lookupLegacyDefaultMessage("title.signupFor")');
    expect(authSource).toContain('lookupLegacyDefaultMessage("title.resetPasswordFor")');
    expect(authSource).not.toContain("fallback: 'Log in to <span class=\"highlight\">{0}</span>'");
    expect(authSource).not.toContain(
      "fallback: 'Sign up for <span class=\"highlight\">{0}</span>'",
    );
    expect(authSource).not.toContain(
      "fallback: 'Reset password for <span class=\"highlight\">{0}</span>'",
    );
  });

  it("uses legacy default messages for public home signup fallback without hardcoded templates", () => {
    expect(lookupLegacyDefaultMessage("button.signup")).toBe("Sign up for {0}");

    const homeSource = readFileSync(`${__dirname}/routes/-home-view.tsx`, "utf8");
    expect(homeSource).toContain('lookupLegacyDefaultMessage("button.signup")');
    expect(homeSource).not.toContain("fallback: `Sign up for ${siteName}`");
  });

  it("uses browser preferred languages for initial state when they match configured legacy languages", () => {
    expect(resolveInitialLanguage(["en-US", "ko-KR"], ["ko-KR", "en-US"])).toBe("ko-KR");
    expect(resolveInitialLanguage(["en-US", "ko-KR"], ["fr-FR", "ko"])).toBe("ko-KR");
    expect(resolveInitialLanguage(["en-US", "ko-KR"], ["fr-FR"])).toBe("en-US");
  });

  it("changes auth message lookup through the runtime provider without changing the route href", () => {
    const routeHref = "/users/loginform?redirectUrl=/me";
    const html = renderToStaticMarkup(
      <LegacyI18nProvider supportedLanguages={["ko-KR", "en-US"]}>
        <LoginPage
          authUiCapabilities={{
            emailVerificationEnabled: false,
            signupRequireConfirm: false,
            socialLoginOnly: false,
          }}
          routeHref={routeHref}
          runtimeConfig={{ apiBaseUrl: "/yona/api", basePath: "/yona", siteName: "Yona" }}
        />
      </LegacyI18nProvider>,
    );

    expect(html).toContain('name="redirectUrl"');
    expect(html).toContain('value="/me"');
    expect(html).toContain('<span class="highlight">Yona</span> 로그인');
    expect(html).toContain(">21세기 소프트웨어 개발 플랫폼<");
    expect(html).toContain(">로그인<");
    expect(html).toContain('placeholder="아이디 또는 이메일"');
    expect(html).not.toContain(">button.login<");
  });

  it("keeps current fallback copy outside an i18n provider", () => {
    const html = renderToStaticMarkup(
      <LoginPage
        authUiCapabilities={{
          emailVerificationEnabled: false,
          signupRequireConfirm: false,
          socialLoginOnly: false,
        }}
        routeHref="/users/loginform"
        runtimeConfig={{ apiBaseUrl: "/yona/api", basePath: "/yona", siteName: "Yona" }}
      />,
    );

    expect(html).toContain('Log in to <span class="highlight">Yona</span>');
    expect(html).toContain(">app.description<");
    expect(html).toContain(">button.login<");
  });

  it("opts common runtime shell message keys into legacy lookup without adding UI", () => {
    const badRequestHtml = renderToStaticMarkup(
      <LegacyI18nProvider supportedLanguages={["ko-KR", "en-US"]}>
        <BadRequestPage href="/yona/" />
      </LegacyI18nProvider>,
    );
    const forbiddenHtml = renderToStaticMarkup(
      <LegacyI18nProvider supportedLanguages={["ko-KR", "en-US"]}>
        <ForbiddenPage href="/yona/" />
      </LegacyI18nProvider>,
    );
    const notFoundHtml = renderToStaticMarkup(
      <LegacyI18nProvider supportedLanguages={["ko-KR", "en-US"]}>
        <NotFoundPage href="/yona/missing" />
      </LegacyI18nProvider>,
    );

    expect(badRequestHtml).toContain(">잘못된 요청입니다</p>");
    expect(badRequestHtml).toContain(">홈</a>");
    expect(forbiddenHtml).toContain(">권한이 없습니다</p>");
    expect(notFoundHtml).toContain(">페이지를 찾을 수 없습니다</p>");
  });

  it("keeps visible fallbacks in the legacy keyspace", () => {
    const routeSources = [
      "./routes/-auth-views.tsx",
      "./routes/-board-views.tsx",
      "./routes/-issue-views.tsx",
      "./routes/-project-views.tsx",
      "./routes/-pull-request-views.tsx",
      "./routes/__root.tsx",
    ].map((path) => readFileSync(new URL(path, import.meta.url), "utf8"));

    for (const source of routeSources) {
      expect(source).not.toMatch(/fallback:\s*`[^`]*\s[^`]*`/u);
      expect(source).not.toMatch(/fallback:\s*"[^"]*\s[^"]*"/u);
      expect(source).not.toMatch(/fallback:\s*'[^']*\s[^']*'/u);
    }
  });

  it("uses legacy message files only where the language has evidence", () => {
    expect(lookupLegacyMessage("en-US", "post.update.error")).toBe("Errors in input values.");
    expect(lookupLegacyMessage("ko-KR", "post.update.error")).toBe("입력값 오류");
    expect(lookupLegacyMessage("ja-JP", "post.update.error")).toBe("入力エラー");
    expect(lookupLegacyMessage("ru-RU", "post.update.error")).toBe("Ошибки в входных значений.");
    expect(lookupLegacyMessage("uz-UZ", "post.update.error")).toBe("Kirishda xatolar bori.");

    expect(
      lookupLegacyMessage("ko-KR", "pullRequest.error.newPullRequestForm", {
        args: ["repo", "main"],
      }),
    ).toBe("코드를 보낼 수 없는 프로젝트 또는 브랜치입니다<br>(repo main)");
    expect(lookupLegacyMessage("en-US", "pullRequest.error.newPullRequestForm")).toBe(
      "Invalid project or branch<br>({0} {1})",
    );
    expect(lookupLegacyMessage("ru-RU", "pullRequest.error.newPullRequestForm")).toBe(
      "Неверный проект или филиал <br> ({0} {1})",
    );
    expect(lookupLegacyMessage("uz-UZ", "pullRequest.error.newPullRequestForm")).toBe(
      "Pull-so`rov qilomaydigan loyiha yoki bo`lakdir<br>({0} {1})",
    );
    expect(
      lookupLegacyMessage("ja-JP", "pullRequest.error.newPullRequestForm", {
        fallback: "pullRequest.error.newPullRequestForm",
      }),
    ).toBe("pullRequest.error.newPullRequestForm");
  });
});
