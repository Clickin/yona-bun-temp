import assert from "node:assert/strict";
import test from "node:test";
import {
  injectPreviewRuntimeConfig,
  resolveStylexVerificationProfile,
  stylexVerificationBuildRequired,
  stylexVerificationEnvironment,
} from "./stylex-verification-profile.mjs";

test("StyleX fast profile is fallback-off and target-scoped", () => {
  assert.equal(resolveStylexVerificationProfile("fast").name, "fast");
  assert.deepEqual(stylexVerificationEnvironment("fast"), {
    YONA_STYLEX_PROFILE: "fast",
    VITE_DISABLE_LEGACY_FALLBACK: "1",
    YONA_E2E_FALLBACK_MODE: "fallback-off",
    YONA_E2E_TRACE_MODE: "off",
    PW_CHANNEL: "chrome",
  });
});

test("StyleX final profile retains the full visual-lock contract", () => {
  const profile = resolveStylexVerificationProfile("final");
  assert.equal(profile.deferred.length, 0);
  assert.match(profile.required.join(" "), /legacy screenshot/u);
  assert.match(profile.required.join(" "), /global fallback/u);
  assert.equal(stylexVerificationBuildRequired("final"), true);
  assert.equal(stylexVerificationBuildRequired("fast"), false);
  assert.equal(stylexVerificationEnvironment("final").YONA_E2E_FRONTEND_MODE, "preview");
  assert.equal(stylexVerificationEnvironment("final").YONA_E2E_TRACE_MODE, "retain-on-failure");
  assert.equal(stylexVerificationEnvironment("final").VITE_YONA_BASE_PATH, "/yona");
  assert.equal(
    injectPreviewRuntimeConfig("<html><head></head></html>", "/yona"),
    '<html><head><script>window.__YONA_RUNTIME_CONFIG__ ||= {basePath:"/yona"};</script></head></html>',
  );
});

test("unknown StyleX verification profiles fail explicitly", () => {
  assert.throws(() => resolveStylexVerificationProfile("all-the-things"), /Use 'fast' or 'final'/u);
});
