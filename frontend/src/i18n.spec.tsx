import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  LegacyI18nProvider,
  createLegacyI18nRuntime,
  normalizeLegacyLanguageCode,
  normalizeSupportedLanguages,
} from "./i18n";
import { LoginPage } from "./routes/-auth-views";

describe("legacy i18n runtime", () => {
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
    expect(runtime.t("title.loginFor", { args: ["Yona"] })).toBe(
      '<span class="highlight">Yona</span> 로그인',
    );

    runtime.setLanguage("ru-RU");

    expect(runtime.language).toBe("ko-KR");
    expect(runtime.t("missing.legacy.key", { fallback: "missing.legacy.key" })).toBe(
      "missing.legacy.key",
    );
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
});
