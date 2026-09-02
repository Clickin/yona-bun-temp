// Dual adapter: translate abstract actions into legacy direct form POSTs and
// Yoram /api/v1 calls. Translation is pure (unit-testable); execution wraps fetch.

// --- pure translation -------------------------------------------------------

// Translation is delegated to per-action definitions in the domain registry
// (scripts/differential/scenarios/*.mjs).
import { ACTION_DEFINITIONS } from "./scenarios/index.mjs";

export function translateLegacy(step, resolved = {}) {
  const definition = ACTION_DEFINITIONS[step.action];
  if (!definition?.translateLegacy) throw new Error(`legacy adapter cannot translate action: ${step.action}`);
  return definition.translateLegacy(step, resolved);
}

export function translateYoram(step, resolved = {}) {
  const definition = ACTION_DEFINITIONS[step.action];
  if (!definition?.translateYoram) throw new Error(`yoram adapter cannot translate action: ${step.action}`);
  return definition.translateYoram(step, resolved);
}


// --- session handling -------------------------------------------------------

function cookieHeader(response) {
  // node fetch exposes set-cookie via headers.getSetCookie()
  const cookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
}
function mergeCookieHeader(oldHeader, setCookies) {
  const jar = new Map();
  for (const pair of (oldHeader ?? "").split("; ").filter(Boolean)) {
    const eq = pair.indexOf("=");
    if (eq > 0) jar.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
  for (const cookie of setCookies) {
    const first = cookie.split(";")[0];
    const eq = first.indexOf("=");
    if (eq > 0) jar.set(first.slice(0, eq), first.slice(eq + 1));
  }
  return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
}

export class LegacySession {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.cookies = "";
  }
  async login({ loginId, password }) {
    const response = await fetch(`${this.baseUrl}/users/login`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      // legacy AuthInfo binds "loginIdOrEmail" + "password" (UserApp.login).
      body: new URLSearchParams({ loginIdOrEmail: loginId, password }).toString(),
      redirect: "manual",
    });
    this.cookies = cookieHeader(response);
    return { status: response.status, location: response.headers.get("location") ?? "" };
  }

  async request(translation) {
    const headers = { cookie: this.cookies };
    let body;
    if (translation.json) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(translation.json);
    } else if (translation.form) {
      const contentType = translation.headers?.["content-type"];
      if (contentType === "application/x-www-form-urlencoded") {
        headers["content-type"] = contentType;
        body = new URLSearchParams(Object.entries(translation.form).map(([key, value]) => [key, String(value)])).toString();
      } else {
        // ponytail: legacy Play handlers read issue/comment bodies via
        // asMultipartFormData() (urlencoded NPEs in IssueApp.newIssue), so all
        // form POSTs are multipart unless an endpoint explicitly opts out.
        body = new FormData();
        for (const [key, value] of Object.entries(translation.form)) body.append(key, String(value));
      }
    }
    Object.assign(headers, translation.headers ?? {});
    const response = await fetch(`${this.baseUrl}${translation.path}`, {
      method: translation.method,
      headers,
      body,
      redirect: "manual",
    });
    const location = response.headers.get("location") ?? "";
    // Merge instead of replace: flash-only Set-Cookie responses (e.g. Play
    // validation warnings) must not wipe PLAY_SESSION and drop the login.
    const nextCookies = response.headers.getSetCookie?.() ?? [];
    if (nextCookies.length > 0) this.cookies = mergeCookieHeader(this.cookies, nextCookies);
    let text = "";
    if (!location) text = await response.text();
    return { status: response.status, location, body: text };
  }
}

export class YoramSession {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.cookies = "";
    this.csrfToken = "";
  }
  async login({ loginId, password }) {
    // sign-in requires an anonymous pilot session + CSRF token; prime both.
    const primed = await fetch(`${this.baseUrl}/api/auth/session`);
    this.csrfToken = primed.headers.get("x-csrf-token") ?? "";
    this.cookies = mergeCookieHeader(this.cookies, primed.headers.getSetCookie?.() ?? []);
    const result = await this.request({
      method: "POST",
      path: "/api/v1/auth/sign-in",
      json: { identifier: loginId, password, rememberMe: false },
    });
    if (result.status !== 200) return result;
    const session = await fetch(`${this.baseUrl}/api/auth/session`, { headers: { cookie: this.cookies } });
    this.csrfToken = session.headers.get("x-csrf-token") ?? this.csrfToken;
    const sessionCookies = session.headers.getSetCookie?.() ?? [];
    if (sessionCookies.length > 0) this.cookies = mergeCookieHeader(this.cookies, sessionCookies);
    return result;
  }

  async request(translation) {
    const headers = { cookie: this.cookies };
    if (this.csrfToken) headers["x-csrf-token"] = this.csrfToken;
    let body;
    if (translation.form) {
      headers["content-type"] = "application/x-www-form-urlencoded";
      body = new URLSearchParams(Object.entries(translation.form).map(([key, value]) => [key, String(value)])).toString();
    } else if (translation.json) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(translation.json);
    }
    const response = await fetch(`${this.baseUrl}${translation.path}`, {
      method: translation.method,
      headers,
      body,
      redirect: translation.redirect ?? "follow",
    });
    const nextCookies = response.headers.getSetCookie?.() ?? [];
    if (nextCookies.length > 0) this.cookies = mergeCookieHeader(this.cookies, nextCookies);
    const text = await response.text();
    const location = response.headers.get("location") ?? "";
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      // non-JSON response bodies are kept as text
    }
    return { status: response.status, location, json, body: text };
  }

  async fetchPage(pagePath) {
    const response = await fetch(`${this.baseUrl}${pagePath}`, { headers: { cookie: this.cookies } });
    return { status: response.status, body: await response.text() };
  }
}
