import { readFile, readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("unreachable row-fluid controls-row bridge is retired", async () => {
  const [appCss, bootstrap, fallback] = await Promise.all([
    readFile("src/app.css", "utf8"),
    readFile("public/legacy-assets/bootstrap/css/bootstrap.css", "utf8"),
    readFile("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8"),
  ]);

  const selector = '.row-fluid .controls-row [class*="span"] + [class*="span"]';
  expect(appCss).not.toContain(`${selector} {`);
  expect(bootstrap).toContain(`${selector} {`);
  expect(fallback).toContain(`${selector} {`);
  expect(appCss).toContain('.row-fluid [class*="span"]:first-child {');
  expect(appCss).toContain(".row-fluid .span12 {");
});
