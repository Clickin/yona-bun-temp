const URLPattern = {};
const baseLocale = "en";
const locales =
  /** @type {const} */
  ["en", "ko-kr"];
const cookieName = "PARAGLIDE_LOCALE";
const strategy = ["cookie", "globalVariable", "baseLocale"];
const routeStrategies = [];
let cachedRouteStrategyUrl;
let cachedRouteStrategy;
function findMatchingRouteStrategy(url) {
  if (routeStrategies.length === 0) {
    return void 0;
  }
  const urlString = typeof url === "string" ? url : url.href;
  if (cachedRouteStrategyUrl === urlString) {
    return cachedRouteStrategy;
  }
  const urlObject = new URL(urlString, "http://dummy.com");
  let match;
  for (const routeStrategy of routeStrategies) {
    const pattern = new URLPattern(routeStrategy.match, urlObject.href);
    if (pattern.exec(urlObject.href)) {
      match = routeStrategy;
      break;
    }
  }
  cachedRouteStrategyUrl = urlString;
  cachedRouteStrategy = match;
  return match;
}
function getStrategyForUrl(url) {
  const routeStrategy = findMatchingRouteStrategy(url);
  if (routeStrategy && routeStrategy.exclude !== true && Array.isArray(routeStrategy.strategy)) {
    return routeStrategy.strategy;
  }
  return strategy;
}
function isExcludedByRouteStrategy(url) {
  return findMatchingRouteStrategy(url)?.exclude === true;
}
let serverAsyncLocalStorage = void 0;
function overwriteServerAsyncLocalStorage(value) {
  serverAsyncLocalStorage = value;
}
globalThis.__paraglide = {};
let _locale;
let localeInitiallySet = false;
let getLocale = () => {
  if (serverAsyncLocalStorage) {
    const locale = serverAsyncLocalStorage?.getStore()?.locale;
    if (locale) {
      return locale;
    }
  }
  let strategyToUse = strategy;
  const resolved = resolveLocaleWithStrategies(strategyToUse);
  if (resolved) {
    if (!localeInitiallySet) {
      _locale = resolved;
      localeInitiallySet = true;
      setLocale(resolved, { reload: false });
    }
    return resolved;
  }
  throw new Error(
    "No locale found. Read the docs https://inlang.com/m/gerre34r/library-inlang-paraglideJs/errors#no-locale-found",
  );
};
function getLocaleForUrl(url) {
  const strategyToUse = getStrategyForUrl(url);
  const resolved = resolveLocaleWithStrategies(
    strategyToUse,
    typeof url === "string" ? url : url.href,
  );
  if (resolved) {
    return resolved;
  }
  throw new Error(
    "No locale found. Read the docs https://inlang.com/m/gerre34r/library-inlang-paraglideJs/errors#no-locale-found",
  );
}
function resolveLocaleWithStrategies(strategyToUse, urlForUrlStrategy) {
  let locale;
  for (const strat of strategyToUse) {
    if (strat === "cookie") {
      locale = extractLocaleFromCookie();
    } else if (strat === "baseLocale") {
      locale = baseLocale;
    } else if (strat === "globalVariable" && _locale !== void 0) {
      locale = _locale;
    } else if (isCustomStrategy(strat) && customClientStrategies.has(strat)) {
      const handler = customClientStrategies.get(strat);
      if (handler) {
        const result = handler.getLocale();
        if (result instanceof Promise) {
          continue;
        }
        locale = result;
      }
    }
    if (locale !== void 0) {
      return assertIsLocale(locale);
    }
  }
  return void 0;
}
const rtlLanguages = /* @__PURE__ */ new Set([
  "ar",
  "dv",
  "fa",
  "he",
  "ks",
  "ku",
  "ps",
  "sd",
  "ug",
  "ur",
  "yi",
]);
function getTextDirection(locale = getLocale()) {
  try {
    const intlLocale =
      /** @type {Intl.Locale & {
          getTextInfo?: () => { direction?: string };
          textInfo?: { direction?: string };
      }} */
      new Intl.Locale(locale);
    const direction = intlLocale.getTextInfo?.().direction ?? intlLocale.textInfo?.direction;
    if (direction === "ltr" || direction === "rtl") {
      return direction;
    }
  } catch {}
  const language = locale.split("-")[0]?.toLowerCase();
  return rtlLanguages.has(language ?? "") ? "rtl" : "ltr";
}
let setLocale = (newLocale, options) => {
  ({
    ...options,
  });
  let currentLocale;
  try {
    currentLocale = getLocale();
  } catch {}
  const customSetLocalePromises = [];
  let strategyToUse = strategy;
  for (const strat of strategyToUse) {
    if (strat === "globalVariable") {
      _locale = newLocale;
    } else if (strat === "cookie") {
      {
        continue;
      }
    } else if (strat === "baseLocale") {
      continue;
    } else if (isCustomStrategy(strat) && customClientStrategies.has(strat)) {
      const handler = customClientStrategies.get(strat);
      if (handler) {
        let result = handler.setLocale(newLocale);
        if (result instanceof Promise) {
          result = result.catch((error) => {
            throw new Error(`Custom strategy "${strat}" setLocale failed.`, {
              cause: error,
            });
          });
          customSetLocalePromises.push(result);
        }
      }
    }
  }
  if (customSetLocalePromises.length) {
    return Promise.all(customSetLocalePromises).then(() => {});
  }
  return;
};
let getUrlOrigin = () => {
  if (serverAsyncLocalStorage) {
    return serverAsyncLocalStorage.getStore()?.origin ?? "http://fallback.com";
  } else if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "http://fallback.com";
};
function isLocale(locale) {
  if (typeof locale !== "string") return false;
  return !locale ? false : locales.some((item) => item.toLowerCase() === locale.toLowerCase());
}
function assertIsLocale(input) {
  if (typeof input !== "string") {
    throw new Error(`Invalid locale: ${input}. Expected a string.`);
  }
  const lowerInput = input.toLowerCase();
  const matchedLocale = locales.find((item) => item.toLowerCase() === lowerInput);
  if (!matchedLocale) {
    throw new Error(`Invalid locale: ${input}. Expected one of: ${locales.join(", ")}`);
  }
  return matchedLocale;
}
const extractLocaleFromRequestWithStrategies = (request, strategies) => {
  let locale;
  for (const strat of strategies) {
    if (strat === "cookie") {
      locale = request.headers
        .get("cookie")
        ?.split("; ")
        .find((c) => c.startsWith(cookieName + "="))
        ?.split("=")[1];
    } else if (strat === "globalVariable") {
      locale = _locale;
    } else if (strat === "baseLocale") {
      return baseLocale;
    } else if (strat === "localStorage") {
      continue;
    } else if (isCustomStrategy(strat)) {
      continue;
    }
    if (locale !== void 0) {
      if (!isLocale(locale)) {
        locale = void 0;
      } else {
        return assertIsLocale(locale);
      }
    }
  }
  throw new Error(
    "No locale found. There is an error in your strategy. Try adding 'baseLocale' as the very last strategy. Read more here https://inlang.com/m/gerre34r/library-inlang-paraglideJs/errors#no-locale-found",
  );
};
const extractLocaleFromRequestAsync = async (request) => {
  let locale;
  const strategy2 = getStrategyForUrl(request.url);
  for (const strat of strategy2) {
    if (isCustomStrategy(strat) && customServerStrategies.has(strat)) {
      const handler = customServerStrategies.get(strat);
      if (handler) {
        locale = await handler.getLocale(request);
      }
      if (locale !== void 0 && isLocale(locale)) {
        return assertIsLocale(locale);
      }
    }
  }
  locale = extractLocaleFromRequestWithStrategies(request, strategy2);
  return assertIsLocale(locale);
};
function extractLocaleFromCookie() {
  if (typeof document === "undefined" || !document.cookie) {
    return;
  }
  const match = document.cookie.match(new RegExp(`(^| )${cookieName}=([^;]+)`));
  const locale = match?.[2];
  if (isLocale(locale)) {
    return locale;
  }
  return void 0;
}
let cachedUrl;
let cachedLocale;
function extractLocaleFromUrl(url) {
  const urlString = typeof url === "string" ? url : url.href;
  if (cachedUrl === urlString) {
    return cachedLocale;
  }
  let result;
  {
    result = defaultUrlPatternExtractLocale(url);
  }
  cachedUrl = urlString;
  cachedLocale = result;
  return result;
}
function defaultUrlPatternExtractLocale(url) {
  const urlObj = new URL(url, "http://dummy.com");
  const pathSegments = urlObj.pathname.split("/").filter(Boolean);
  if (pathSegments.length > 0) {
    const potentialLocale = pathSegments[0];
    if (isLocale(potentialLocale)) {
      return potentialLocale;
    }
  }
  return baseLocale;
}
function localizeUrl(url, options) {
  {
    return localizeUrlDefaultPattern(url, options);
  }
}
function localizeUrlDefaultPattern(url, options) {
  const urlObj = typeof url === "string" ? new URL(url, getUrlOrigin()) : new URL(url);
  const locale = options?.locale ?? getLocale();
  const currentLocale = extractLocaleFromUrl(urlObj);
  if (currentLocale === locale) {
    return urlObj;
  }
  const pathSegments = urlObj.pathname.split("/").filter(Boolean);
  if (pathSegments.length > 0 && isLocale(pathSegments[0])) {
    pathSegments.shift();
  }
  if (locale === baseLocale) {
    urlObj.pathname = "/" + pathSegments.join("/");
  } else {
    urlObj.pathname = "/" + locale + "/" + pathSegments.join("/");
  }
  return urlObj;
}
function deLocalizeUrl(url) {
  {
    return deLocalizeUrlDefaultPattern(url);
  }
}
function deLocalizeUrlDefaultPattern(url) {
  const urlObj = typeof url === "string" ? new URL(url, getUrlOrigin()) : new URL(url);
  const pathSegments = urlObj.pathname.split("/").filter(Boolean);
  if (pathSegments.length > 0 && isLocale(pathSegments[0])) {
    urlObj.pathname = "/" + pathSegments.slice(1).join("/");
  }
  return urlObj;
}
async function shouldRedirect(input = {}) {
  const currentUrl = resolveUrl(input);
  const locale =
    /** @type {ReturnType<typeof assertIsLocale>} */
    await resolveLocale(input, currentUrl);
  const strategy2 = getStrategyForUrl(currentUrl.href);
  if (isExcludedByRouteStrategy(currentUrl.href) || !strategy2.includes("url")) {
    return { shouldRedirect: false, locale, redirectUrl: void 0 };
  }
  const localizedUrl = localizeUrl(currentUrl.href, { locale });
  const shouldRedirectToLocalizedUrl =
    normalizeUrl(localizedUrl.href) !== normalizeUrl(currentUrl.href);
  return {
    shouldRedirect: shouldRedirectToLocalizedUrl,
    locale,
    redirectUrl: shouldRedirectToLocalizedUrl ? localizedUrl : void 0,
  };
}
async function resolveLocale(input, currentUrl) {
  if (input.locale) {
    return assertIsLocale(input.locale);
  }
  if (input.request) {
    return extractLocaleFromRequestAsync(input.request);
  }
  if (typeof input.url !== "undefined") {
    return getLocaleForUrl(currentUrl.href);
  }
  return getLocale();
}
function resolveUrl(input) {
  if (input.request) {
    return new URL(input.request.url);
  }
  if (input.url instanceof URL) {
    return new URL(input.url.href);
  }
  if (typeof input.url === "string") {
    return new URL(input.url, getUrlOrigin());
  }
  if (typeof window !== "undefined" && window?.location?.href) {
    return new URL(window.location.href);
  }
  throw new Error(
    "shouldRedirect() requires either a request, an absolute URL, or must run in a browser environment.",
  );
}
function normalizeUrl(url) {
  const urlObj = new URL(url);
  urlObj.pathname = urlObj.pathname.replace(/\/$/, "");
  return urlObj.href;
}
function localizeHref(href, options) {
  const currentLocale = getLocale();
  const locale = options?.locale ?? currentLocale;
  const url = new URL(href, getUrlOrigin());
  const localized = localizeUrl(url, { locale });
  if (href.startsWith("/") && url.origin === localized.origin) {
    if (locale !== currentLocale) {
      const localizedCurrentLocale = localizeUrl(url, {
        locale: currentLocale,
      });
      if (localizedCurrentLocale.origin !== localized.origin) {
        return localized.href;
      }
    }
    return localized.pathname + localized.search + localized.hash;
  }
  return localized.href;
}
const customServerStrategies = /* @__PURE__ */ new Map();
const customClientStrategies = /* @__PURE__ */ new Map();
function isCustomStrategy(strategy2) {
  return typeof strategy2 === "string" && /^custom-[A-Za-z0-9_-]+$/.test(strategy2);
}
export {
  locales as a,
  baseLocale as b,
  shouldRedirect as c,
  deLocalizeUrl as d,
  getTextDirection as e,
  getStrategyForUrl as g,
  isExcludedByRouteStrategy as i,
  localizeHref as l,
  overwriteServerAsyncLocalStorage as o,
  serverAsyncLocalStorage as s,
};
