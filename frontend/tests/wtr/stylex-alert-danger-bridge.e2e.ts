import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

test("unreachable alert-danger app.css branches are retired", async () => {
  const [appCss, bootstrap, fallback] = await Promise.all([
    readFileSync("src/app.css", "utf8"),
    readFileSync("../frontend/public/legacy-assets/bootstrap/css/bootstrap.css", "utf8"),
    readFileSync("../frontend/public/legacy-assets/stylesheets/legacy-fallback.css", "utf8"),
  ]);

  expect(appCss).not.toContain(".alert-danger,");
  expect(appCss).not.toContain(".alert-danger h4,");
  expect(appCss).toContain(".alert-error {");
  expect(appCss).toContain(".alert-error h4 {");

  // Frozen Bootstrap and generated fallback remain available for legacy/plugin
  // output even though no current React or Scala view emits alert-danger.
  expect(bootstrap).toContain(".alert-danger,");
  expect(fallback).toContain(".alert-danger,");
});
