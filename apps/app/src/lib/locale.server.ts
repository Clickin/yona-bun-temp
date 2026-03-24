import { getCookie, getRequest, getRequestHeader, setCookie } from "@tanstack/react-start/server";
import { defaultLocale, normalizeLocale, resolveLocale, resolveLocaleCandidate, type Locale } from "@yona/i18n";

export const localeCookieName = "yona-locale";

const localeCookieOptions = {
  maxAge: 60 * 60 * 24 * 365,
  path: "/",
  sameSite: "lax" as const,
};

function readRequestedLocaleOverride(): Locale | undefined {
  const request = getRequest();
  const lang = new URL(request.url).searchParams.get("lang");
  return resolveLocaleCandidate(lang);
}

function resolveServerLocale(): Locale {
  const requestedLocale = readRequestedLocaleOverride();
  if (requestedLocale) {
    return requestedLocale;
  }

  const cookieLocale = getCookie(localeCookieName);
  if (cookieLocale) {
    return normalizeLocale(cookieLocale);
  }

  const acceptLanguage = getRequestHeader("accept-language");
  return acceptLanguage ? resolveLocale([acceptLanguage]) : defaultLocale;
}

export function readCurrentLocaleServer() {
  const locale = resolveServerLocale();

  if (getCookie(localeCookieName) !== locale) {
    setCookie(localeCookieName, locale, localeCookieOptions);
  }

  return {
    locale,
  };
}
