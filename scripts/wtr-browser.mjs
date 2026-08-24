import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const requireFrontend = createRequire(new URL("../frontend/package.json", import.meta.url));
const { chromeLauncher } = requireFrontend("@web/test-runner-chrome");

function responseFromPuppeteer(response, requestCache) {
  if (!response) return null;
  return {
    headers: () => response.headers(),
    json: () => response.json(),
    ok: () => response.ok(),
    request: () => requestFromPuppeteer(response.request(), requestCache),
    status: () => response.status(),
    text: () => response.text(),
    url: () => response.url(),
  };
}

function requestFromPuppeteer(request, requestCache) {
  if (!request) return null;
  if (requestCache?.has(request)) return requestCache.get(request);
  const wrapped = {
    failure: () => request.failure(),
    method: () => request.method(),
    postData: () => request.postData(),
    resourceType: () => request.resourceType(),
    url: () => request.url(),
  };
  requestCache?.set(request, wrapped);
  return wrapped;
}

function apiResponseFromFetch(result) {
  const headers = result.headers ?? {};
  return {
    headers: () => headers,
    json: async () => JSON.parse(result.body),
    ok: () => result.status >= 200 && result.status < 300,
    status: () => result.status,
    text: async () => result.body,
    url: () => result.url,
  };
}

class WtrSweepLocator {
  constructor(page, selector, firstOnly = false) {
    this.page = page;
    this.selector = selector;
    this.firstOnly = firstOnly;
  }

  first() {
    return new WtrSweepLocator(this.page, this.selector, true);
  }

  locator(selector) {
    return new WtrSweepLocator(this.page, `${this.selector} ${selector}`, false);
  }

  async count() {
    const count = await this.page.nativePage.$$eval(this.selector, (elements) => elements.length);
    return this.firstOnly ? Math.min(count, 1) : count;
  }

  async fill(value) {
    await this.page.nativePage.evaluate(
      (selector, firstOnly, nextValue) => {
        const element = document.querySelectorAll(selector)[firstOnly ? 0 : 0];
        if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
          throw new Error(`Cannot fill non-form element: ${selector}`);
        }
        element.focus();
        const prototype =
          element instanceof HTMLTextAreaElement
            ? HTMLTextAreaElement.prototype
            : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
        setter?.call(element, nextValue);
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
      },
      this.selector,
      this.firstOnly,
      value,
    );
  }

  async waitFor(options = {}) {
    const waitOptions = { timeout: options.timeout };
    if (options.state === "visible") waitOptions.visible = true;
    if (options.state === "hidden") waitOptions.hidden = true;
    await this.page.nativePage.waitForSelector(this.selector, waitOptions);
  }

  async isVisible() {
    return this.page.nativePage.evaluate((selector) => {
      const element = document.querySelector(selector);
      if (!element) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        rect.width > 0 &&
        rect.height > 0
      );
    }, this.selector);
  }

  async click(options = {}) {
    await this.page.nativePage.click(this.selector, options);
  }

  async evaluateAll(pageFunction, ...args) {
    return this.page.nativePage.$$eval(this.selector, pageFunction, ...args);
  }

  async evaluate(pageFunction, ...args) {
    return this.page.nativePage.$eval(this.selector, pageFunction, ...args);
  }

  async check() {
    await this.page.nativePage.$eval(this.selector, (element) => {
      if (!(element instanceof HTMLInputElement)) {
        throw new Error("Cannot check a non-input element");
      }
      element.checked = true;
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  async allInnerTexts() {
    return this.page.nativePage.$$eval(this.selector, (elements) =>
      elements.map((element) => element.textContent ?? ""),
    );
  }

  async innerText() {
    return this.page.nativePage.$eval(this.selector, (element) => element.innerText);
  }
}

export class WtrSweepPage {
  constructor(nativePage) {
    this.nativePage = nativePage;
    this.listeners = new Map();
    this.requestWrappers = new WeakMap();
    this.extraHeaders = {};
    this.request = {
      get: (url, options) => this.requestJson("GET", url, options),
      patch: (url, options) => this.requestJson("PATCH", url, options),
      post: (url, options) => this.requestJson("POST", url, options),
      put: (url, options) => this.requestJson("PUT", url, options),
    };
  }

  async requestJson(method, url, options = {}) {
    const target = new URL(url);
    const currentUrl = this.url();
    if (!/^https?:/u.test(currentUrl) || new URL(currentUrl).origin !== target.origin) {
      const appPath = target.pathname.match(/^(.*)\/api(?:\/|$)/u)?.[1] ?? "";
      await this.goto(`${target.origin}${appPath || "/"}/`, { waitUntil: "domcontentloaded" });
    }
    const result = await this.nativePage.evaluate(
      async ({ method: requestMethod, url: requestUrl, data, headers }) => {
        const hasData = data !== undefined;
        const response = await fetch(requestUrl, {
          body: hasData ? JSON.stringify(data) : undefined,
          credentials: "include",
          headers: {
            ...(hasData ? { "content-type": "application/json" } : {}),
            ...headers,
          },
          method: requestMethod,
        });
        return {
          body: await response.text(),
          headers: Object.fromEntries(response.headers.entries()),
          status: response.status,
          url: response.url,
        };
      },
      {
        data: options.data,
        headers: { ...this.extraHeaders, ...(options.headers ?? {}) },
        method,
        url,
      },
    );
    return apiResponseFromFetch(result);
  }

  async goto(url, options = {}) {
    const response = await this.nativePage.goto(url, {
      timeout: options.timeout,
      // Playwright-spelling compat: puppeteer calls this networkidle2.
      waitUntil: options.waitUntil === "networkidle" ? "networkidle2" : options.waitUntil ?? "load",
    });
    return responseFromPuppeteer(response, this.requestWrappers);
  }

  async waitForTimeout(timeout) {
    await this.nativePage.waitForTimeout(timeout);
  }

  async waitForFunction(pageFunction, arg, options = {}) {
    return this.nativePage.waitForFunction(pageFunction, options, arg);
  }

  async waitForLoadState(state, options = {}) {
    if (state === "networkidle") {
      await this.nativePage.waitForNetworkIdle({ idleTime: 500, timeout: options.timeout });
      return;
    }
    if (state === "load") {
      await this.nativePage.waitForFunction(() => document.readyState === "complete", {
        timeout: options.timeout,
      });
    }
  }

  locator(selector) {
    return new WtrSweepLocator(this, selector);
  }

  fill(selector, value) {
    return this.locator(selector).fill(value);
  }

  async selectOption(selector, options) {
    await this.nativePage.$eval(
      selector,
      (element, selection, selectorName) => {
        if (!(element instanceof HTMLSelectElement)) {
          throw new Error(`Cannot select an option on a non-select element: ${selectorName}`);
        }
        const option =
          typeof selection === "string"
            ? [...element.options].find((candidate) => candidate.value === selection)
            : selection?.label !== undefined
              ? [...element.options].find((candidate) => candidate.label === selection.label)
              : [...element.options].find((candidate) => candidate.value === selection?.value);
        if (!option) throw new Error(`Option not found for ${selector}`);
        for (const candidate of element.options) candidate.selected = candidate === option;
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
      },
      options,
      selector,
    );
  }

  async waitForSelector(selector, options = {}) {
    await this.nativePage.waitForSelector(selector, {
      hidden: options.state === "hidden",
      timeout: options.timeout,
      visible: options.state === "visible",
    });
  }

  url() {
    return this.nativePage.url();
  }

  evaluate(pageFunction, ...args) {
    return this.nativePage.evaluate(pageFunction, ...args);
  }

  async waitForNavigation(options = {}) {
    const response = await this.nativePage.waitForNavigation({
      timeout: options.timeout,
      waitUntil: options.waitUntil ?? "load",
    });
    if (typeof options.url === "function") {
      options.url(new URL(this.url()));
    }
    return responseFromPuppeteer(response, this.requestWrappers);
  }

  async waitForResponse(predicate, options = {}) {
    return new Promise((resolve, reject) => {
      let timeoutId;
      const onResponse = async (response) => {
        try {
          if (!(await predicate(response))) return;
          this.off("response", onResponse);
          clearTimeout(timeoutId);
          resolve(response);
        } catch (error) {
          this.off("response", onResponse);
          clearTimeout(timeoutId);
          reject(error);
        }
      };
      this.on("response", onResponse);
      timeoutId = setTimeout(() => {
        this.off("response", onResponse);
        reject(new Error(`Timed out waiting for response after ${options.timeout ?? 30_000}ms`));
      }, options.timeout ?? 30_000);
    });
  }

  on(event, listener) {
    const wrapped =
      event === "request"
        ? (request) => listener(requestFromPuppeteer(request, this.requestWrappers))
        : event === "response"
          ? (response) => listener(responseFromPuppeteer(response, this.requestWrappers))
          : event === "requestfailed"
            ? (request) => listener(requestFromPuppeteer(request, this.requestWrappers))
            : event === "console"
              ? (message) =>
                  listener({
                    location: () => message.location(),
                    text: () => message.text(),
                    type: () => message.type(),
                  })
              : listener;
    const eventListeners = this.listeners.get(event) ?? new Map();
    eventListeners.set(listener, wrapped);
    this.listeners.set(event, eventListeners);
    this.nativePage.on(event, wrapped);
    return this;
  }

  off(event, listener) {
    const wrapped = this.listeners.get(event)?.get(listener);
    if (!wrapped) return this;
    this.nativePage.off(event, wrapped);
    this.listeners.get(event).delete(listener);
    return this;
  }

  async setExtraHTTPHeaders(headers) {
    this.extraHeaders = { ...this.extraHeaders, ...headers };
    await this.nativePage.setExtraHTTPHeaders(this.extraHeaders);
  }

  screenshot(options) {
    return this.nativePage.screenshot(options);
  }

  close() {
    return this.nativePage.close();
  }
}

export async function launchWtrBrowser() {
  const launcher = chromeLauncher({
    concurrency: 2,
    launchOptions: {
      args: ["--no-first-run"],
      headless: true,
    },
  });
  return launcher.launchBrowser();
}

export async function createWtrSweepPage(browser, { height, locale, width }) {
  const nativePage = await browser.defaultBrowserContext().newPage();
  await nativePage.setViewport({ height, width });
  if (locale) {
    await nativePage.setExtraHTTPHeaders({ "accept-language": locale });
  }
  return new WtrSweepPage(nativePage);
}

export async function createWtrSweepContext(browser, options) {
  const nativeContext = await browser.createBrowserContext();
  return {
    close: () => nativeContext.close(),
    newPage: async () => {
      const nativePage = await nativeContext.newPage();
      await nativePage.setViewport({ height: options.height, width: options.width });
      if (options.locale) {
        await nativePage.setExtraHTTPHeaders({ "accept-language": options.locale });
      }
      return new WtrSweepPage(nativePage);
    },
  };
}

export async function installWtrGravatarRoute(page, imagePath) {
  const image = readFileSync(imagePath);
  await page.nativePage.setRequestInterception(true);
  page.nativePage.on("request", async (request) => {
    try {
      if (request.url().includes("www.gravatar.com/avatar/")) {
        await request.respond({ body: image, contentType: "image/png", status: 200 });
      } else {
        await request.continue();
      }
    } catch {
      // The page may close while an intercepted request is still in flight.
    }
  });
}
