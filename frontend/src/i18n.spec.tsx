import { readFileSync, readdirSync } from "node:fs";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  LegacyI18nProvider,
  createLegacyI18nRuntime,
  lookupLegacyMessage,
  normalizeLegacyLanguageCode,
  normalizeSupportedLanguages,
  resolveInitialLanguage,
  useLegacyMessages,
} from "./i18n";
import { LoginPage } from "./routes/-auth-views";
import { BadRequestPage, ForbiddenPage, NotFoundPage } from "./routes/-shared";

function LegacyMessageProbe({ messageKey }: { messageKey: string }) {
  const { t } = useLegacyMessages();
  return <span>{t(messageKey, { fallback: messageKey })}</span>;
}

function parseLegacyMessageKeys(source: string): Set<string> {
  const keys = new Set<string>();
  for (const line of source.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }
    const messageMatch = /^([^=]+)=/u.exec(trimmed);
    if (messageMatch) {
      keys.add(messageMatch[1].trim());
    }
  }
  return keys;
}

function collectSourceFiles(path: URL): URL[] {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const entryUrl = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, path);
    if (entry.isDirectory()) {
      return collectSourceFiles(entryUrl);
    }
    return entry.isFile() && /\.(ts|tsx)$/u.test(entry.name) ? [entryUrl] : [];
  });
}

function collectImplementationSourceFiles(path: URL): URL[] {
  return collectSourceFiles(path).filter(
    (sourceFile) => !/\.(?:spec|test)\.[cm]?[tj]sx?$/u.test(sourceFile.pathname),
  );
}

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
    expect(runtime.t("title.pullrequest")).toBe("Pull Request");
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

  it("keeps auth title fallbacks in the legacy keyspace without hardcoded templates", () => {
    const authSource = readFileSync(`${__dirname}/routes/-auth-views.tsx`, "utf8");
    expect(authSource).toContain('fallback: "title.loginFor"');
    expect(authSource).toContain('fallback: "title.signupFor"');
    expect(authSource).toContain('fallback: "title.resetPasswordFor"');
    expect(authSource).not.toContain("lookupLegacyDefaultMessage");
    expect(authSource).not.toContain("fallback: 'Log in to <span class=\"highlight\">{0}</span>'");
    expect(authSource).not.toContain(
      "fallback: 'Sign up for <span class=\"highlight\">{0}</span>'",
    );
    expect(authSource).not.toContain(
      "fallback: 'Reset password for <span class=\"highlight\">{0}</span>'",
    );
  });

  it("keeps public home signup fallback in the legacy keyspace without hardcoded templates", () => {
    const homeSource = readFileSync(`${__dirname}/routes/-home-view.tsx`, "utf8");
    expect(homeSource).toContain('fallback: "button.signup"');
    expect(homeSource).not.toContain("lookupLegacyDefaultMessage");
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

  it("falls back through default legacy messages inside the React provider", () => {
    const html = renderToStaticMarkup(
      <LegacyI18nProvider supportedLanguages={["ko-KR", "en-US"]}>
        <LegacyMessageProbe messageKey="project.webhook.includeGitPush" />
      </LegacyI18nProvider>,
    );

    expect(html).toContain(">Include git push events</span>");
    expect(html).not.toContain("project.webhook.includeGitPush");
  });

  it("falls back through default legacy messages outside an i18n provider", () => {
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
    expect(html).toContain(">Web-based platform for collaborative software development<");
    expect(html).toContain(">Log in<");
    expect(html).not.toContain(">title.loginFor<");
    expect(html).not.toContain(">app.description<");
    expect(html).not.toContain(">button.login<");
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

  it("keeps document title keys routed through the legacy message lookup", () => {
    const sharedSource = readFileSync(new URL("./routes/-shared.tsx", import.meta.url), "utf8");

    expect(sharedSource).toContain("const messages = useLegacyMessages();");
    expect(sharedSource).toContain("document.title = messages.t(title, { fallback: title });");
    expect(sharedSource).not.toContain("document.title = title");
  });

  it("keeps visible fallbacks in the legacy keyspace", () => {
    const routeSources = [
      "./routes/-auth-views.tsx",
      "./routes/-board-views.tsx",
      "./routes/-code-views.tsx",
      "./routes/-issue-views.tsx",
      "./routes/-organization-views.tsx",
      "./routes/$owner/$projectName/issue/labelsform/route.tsx",
      "./routes/-project-views.tsx",
      "./routes/-pull-request-views.tsx",
      "./routes/__root.tsx",
    ].map((path) => readFileSync(new URL(path, import.meta.url), "utf8"));

    for (const source of routeSources) {
      expect(source).not.toMatch(/fallback:\s*`[^`]*\s[^`]*`/u);
      expect(source).not.toMatch(/fallback:\s*"[^"]*\s[^"]*"/u);
      expect(source).not.toMatch(/fallback:\s*'[^']*\s[^']*'/u);
      expect(source).not.toContain('`${key} ${args.join(" ")}`');
      expect(source).not.toContain('`${key} ${options.args.join(" ")}`');
    }
  });

  it("falls back through the default legacy message file before key fallback", () => {
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
    ).toBe("Invalid project or branch<br>({0} {1})");
    expect(lookupLegacyMessage("ko-KR", "project.webhook.includeGitPush")).toBe(
      "Include git push events",
    );
    expect(
      lookupLegacyMessage("ko-KR", "missing.legacy.key", { fallback: "missing.legacy.key" }),
    ).toBe("missing.legacy.key");
  });

  it("treats explicit fallback values as legacy keys, not replacement copy", () => {
    expect(
      lookupLegacyMessage("ko-KR", "missing.primary.key", {
        args: ["Yoram"],
        fallback: "title.loginFor",
      }),
    ).toBe('<span class="highlight">Yoram</span> 로그인');
    expect(
      lookupLegacyMessage("ko-KR", "missing.primary.key", {
        fallback: "missing.fallback.key",
      }),
    ).toBe("missing.fallback.key");
  });

  it("resolves root sidebar empty-state keys from legacy message files", () => {
    const rootSource = readFileSync(`${__dirname}/routes/__root.tsx`, "utf8");

    expect(lookupLegacyMessage("en-US", "title.no.results")).toBe("No results");
    expect(lookupLegacyMessage("ko-KR", "title.no.results")).toBe("결과 없음");
    expect(rootSource).toContain('messages("title.no.results"');
    expect(rootSource).not.toContain(">title.no.results<");
  });

  it("keeps route fallback literals inside the legacy message keyspace", () => {
    const legacyKeys = parseLegacyMessageKeys(
      readFileSync(new URL("../../yona-original/conf/messages", import.meta.url), "utf8"),
    );
    const routeFiles = collectSourceFiles(new URL("./routes/", import.meta.url));
    const missingFallbacks: string[] = [];

    for (const routeFile of routeFiles) {
      const source = readFileSync(routeFile, "utf8");
      for (const match of source.matchAll(/fallback:\s*["']([^"']+)["']/gu)) {
        const fallbackKey = match[1];
        if (!legacyKeys.has(fallbackKey)) {
          missingFallbacks.push(`${routeFile.pathname}: ${fallbackKey}`);
        }
      }
    }

    expect(missingFallbacks).toEqual([]);
  });

  it("keeps route static legacy message lookups inside the legacy message keyspace", () => {
    const legacyKeys = parseLegacyMessageKeys(
      readFileSync(new URL("../../yona-original/conf/messages", import.meta.url), "utf8"),
    );
    const routeFiles = collectSourceFiles(new URL("./routes/", import.meta.url));
    const missingLookups: string[] = [];
    const staticLookupPatterns = [
      /lookupLegacyMessage\([^,\n]+,\s*["']([^"']+)["']/gu,
      /legacyMessage\([^,\n]+,\s*["']([^"']+)["']/gu,
      /messages(?:\.t)?\(\s*["']([^"']+)["']/gu,
    ];

    for (const routeFile of routeFiles) {
      const source = readFileSync(routeFile, "utf8");
      for (const pattern of staticLookupPatterns) {
        for (const match of source.matchAll(pattern)) {
          const key = match[1];
          if (/\./u.test(key) && !legacyKeys.has(key)) {
            missingLookups.push(`${routeFile.pathname}: ${key}`);
          }
        }
      }
    }

    expect(missingLookups).toEqual([]);
  });

  it("keeps frontend implementation fallbacks and static lookups inside the legacy keyspace", () => {
    const legacyKeys = parseLegacyMessageKeys(
      readFileSync(new URL("../../yona-original/conf/messages", import.meta.url), "utf8"),
    );
    const implementationFiles = collectImplementationSourceFiles(new URL("./", import.meta.url));
    const missingKeys: string[] = [];
    const staticLookupPatterns = [
      /lookupLegacyMessage\([^,\n]+,\s*["']([^"']+)["']/gu,
      /legacyMessage\([^,\n]+,\s*["']([^"']+)["']/gu,
      /messages(?:\.t)?\(\s*["']([^"']+)["']/gu,
    ];

    for (const sourceFile of implementationFiles) {
      const source = readFileSync(sourceFile, "utf8");
      for (const match of source.matchAll(/fallback:\s*["']([^"']+)["']/gu)) {
        const fallbackKey = match[1];
        if (!legacyKeys.has(fallbackKey)) {
          missingKeys.push(`${sourceFile.pathname}: fallback ${fallbackKey}`);
        }
      }
      for (const pattern of staticLookupPatterns) {
        for (const match of source.matchAll(pattern)) {
          const key = match[1];
          if (/\./u.test(key) && !legacyKeys.has(key)) {
            missingKeys.push(`${sourceFile.pathname}: lookup ${key}`);
          }
        }
      }
    }

    expect(missingKeys).toEqual([]);
  });

  it("does not render dynamic legacy-key templates directly in JSX text", () => {
    const implementationFiles = collectImplementationSourceFiles(new URL("./", import.meta.url));
    const directRenders: string[] = [];
    const directLegacyKeyTemplatePattern =
      />\s*\{\s*`(?:issue\.state|project\.history\.type|user\.role)\.\$\{/u;

    for (const sourceFile of implementationFiles) {
      const source = readFileSync(sourceFile, "utf8");
      if (directLegacyKeyTemplatePattern.test(source)) {
        directRenders.push(sourceFile.pathname);
      }
    }

    expect(directRenders).toEqual([]);
  });

  it("does not keep route-local i18n fallback dictionaries", () => {
    const routeSources = collectSourceFiles(new URL("./routes/", import.meta.url)).map((path) =>
      readFileSync(path, "utf8"),
    );

    for (const source of routeSources) {
      expect(source).not.toContain("LEGACY_COPY");
      expect(source).not.toContain("SOURCE_MESSAGES");
      expect(source).not.toContain("LOCAL_MESSAGES");
    }
  });

  it("uses legacy MessageFormat apostrophe escaping", () => {
    expect(lookupLegacyMessage("en-US", "common.comment.delete.confirm")).toContain("won't");
    expect(lookupLegacyMessage("en-US", "project.watcher.title")).toBe(
      "This projects watcher list.",
    );
    expect(lookupLegacyMessage("ko-KR", "project.webhook.help")).toContain(
      "'Authorizatoin: token 입력한 값'",
    );
    expect(
      lookupLegacyMessage("ko-KR", "git.error.permission", {
        args: ["alice", "owner", "repo"],
      }),
    ).toBe("'alice'님은 'owner/repo' 프로젝트에 대한 권한이 없습니다.");
  });
});
