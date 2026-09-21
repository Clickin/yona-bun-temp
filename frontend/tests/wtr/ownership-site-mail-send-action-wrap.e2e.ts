import { readFileSync, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: node:fs/promises readFile has no browser equivalent; the
// compat readFileSync is a sync XHR over the same middleware. Promise-wrap it
// so the spec's await/Promise.all call sites keep their shape.
const readFile = (path: string | URL, encoding?: string | null): Promise<string> =>
  Promise.resolve(readFileSync(path, encoding ?? "utf8"));

const routeSource = new URL("../src/routes/sites/mail.tsx", import.meta.url);
const legacyTemplate = new URL(
  "../../yona-original/app/views/site/mail.scala.html",
  import.meta.url,
);
const legacyStyles = new URL(
  "../../yona-original/app/assets/stylesheets/less/_page.less",
  import.meta.url,
);

test("site mail send action wrapper owns legacy centering in Style", async () => {
  const [route, legacy, less, css] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(legacyTemplate, "utf8"),
    readFile(legacyStyles, "utf8"),
    Promise.resolve(curatedAppCss()),
  ]);

  expect(legacy).toContain('<div class="span12 mail-btn-wrap">');
  expect(legacy).toContain('<button type="submit" class="ybtn ybtn-primary">');
  expect(less).toContain(".mail-btn-wrap {");
  expect(less).toContain("text-align: center;");

  expect(route).toContain('data-owner="site-mail-send-action-wrap"');

  expect(css).not.toContain(".site-setting-wrap .mail-btn-wrap");
  expect(css).not.toContain(".site-admin-page");
});
