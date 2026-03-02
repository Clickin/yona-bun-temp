import { a as attr, e as ensure_array_like, b as escape_html } from "../../chunks/root.js";
import { b as base } from "../../chunks/server.js";
import "../../chunks/exports.js";
import "@sveltejs/kit/internal/server";
import { p as page } from "../../chunks/index.js";
import { l as localizeHref, a as locales } from "../../chunks/runtime.js";
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { children } = $$props;
    $$renderer2.push(
      `<header class="yona-header" data-testid="yona-shell-header"><div class="yona-header-inner"><a class="yona-brand"${attr("href", localizeHref("/"))}><img class="yona-logo"${attr("src", `${base}/images/yona_logo.png`)} alt="Yona"/> <span class="yona-wordmark">Yona</span></a> <nav class="yona-nav" aria-label="Primary"><a data-testid="yona-nav-projects"${attr("href", localizeHref("/projects"))}>Projects</a> <a data-testid="yona-nav-organizations"${attr("href", localizeHref("/organizations"))}>Organizations</a> <a data-testid="yona-nav-help"${attr("href", localizeHref("/help"))}>Help</a> <a data-testid="yona-nav-login"${attr("href", localizeHref("/login"))}>Login</a></nav></div></header> <main class="yona-main">`,
    );
    children($$renderer2);
    $$renderer2.push(
      `<!----></main> <footer class="yona-footer" data-testid="yona-shell-footer"><div class="yona-footer-inner"><span>Powered by Yona</span> <span class="yona-footer-sep">|</span> <a class="yona-footer-link" href="https://github.com/yona-projects" target="_blank" rel="noreferrer">Project</a></div></footer> <div style="display:none"><!--[-->`,
    );
    const each_array = ensure_array_like(locales);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let locale = each_array[$$index];
      $$renderer2.push(
        `<a${attr("href", localizeHref(page.url.pathname, { locale }))}>${escape_html(locale)}</a>`,
      );
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
export { _layout as default };
