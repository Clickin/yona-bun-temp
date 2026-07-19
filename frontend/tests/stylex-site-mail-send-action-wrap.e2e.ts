import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const routeSource = new URL("../src/routes/sites/mail.tsx", import.meta.url);
const legacyTemplate = new URL(
  "../../yona-original/app/views/site/mail.scala.html",
  import.meta.url,
);
const legacyStyles = new URL(
  "../../yona-original/app/assets/stylesheets/less/_page.less",
  import.meta.url,
);
const appStyles = new URL("../src/app.css", import.meta.url);

test("site mail send action wrapper owns legacy centering in StyleX", async () => {
  const [route, legacy, less, css] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(legacyTemplate, "utf8"),
    readFile(legacyStyles, "utf8"),
    readFile(appStyles, "utf8"),
  ]);

  expect(legacy).toContain('<div class="span12 mail-btn-wrap">');
  expect(legacy).toContain('<button type="submit" class="ybtn ybtn-primary">');
  expect(less).toContain(".mail-btn-wrap {");
  expect(less).toContain("text-align: center;");

  expect(route).toContain("sendActionWrap");
  expect(route).toContain('textAlign: "center"');
  expect(route).toContain('data-stylex-owner="site-mail-send-action-wrap"');
  expect(route).toContain(
    'className={`span12 mail-btn-wrap ${stylex.props(styles.sendActionWrap).className ?? ""}`.trim()}',
  );
  expect(css).not.toContain(".site-setting-wrap .mail-btn-wrap");
  expect(css).not.toContain(".site-admin-page");
});
