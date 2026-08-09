import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const STYLEX_VERIFICATION_PROFILES = Object.freeze({
  fast: Object.freeze({
    name: "fast",
    required: [
      "focused fallback-off WTR",
      "desktop/mobile target metrics",
      "source and provenance checks",
    ],
    deferred: [
      "live legacy screenshot pair",
      "global fallback consumer audit",
      "full fallback-off suite",
      "production build",
    ],
  }),
  final: Object.freeze({
    name: "final",
    required: [
      "focused fallback-off WTR",
      "desktop/mobile target metrics",
      "live legacy screenshot pair",
      "exact pixel/geometry review",
      "global fallback consumer audit",
      "full fallback-off suite",
      "production build and StyleX verifier",
    ],
    deferred: [],
  }),
});

export function resolveStylexVerificationProfile(value = process.env.YONA_STYLEX_PROFILE) {
  const name = value || "fast";
  const profile = STYLEX_VERIFICATION_PROFILES[name];
  if (!profile) {
    throw new Error(`Unknown YONA_STYLEX_PROFILE '${name}'. Use 'fast' or 'final'.`);
  }
  return profile;
}

export function stylexVerificationEnvironment(profileName) {
  const profile = resolveStylexVerificationProfile(profileName);
  return {
    YONA_STYLEX_PROFILE: profile.name,
    VITE_DISABLE_LEGACY_FALLBACK: "1",
    YONA_E2E_FALLBACK_MODE: "fallback-off",
    YONA_E2E_TRACE_MODE: profile.name === "fast" ? "off" : "retain-on-failure",
    ...(profile.name === "final"
      ? {
          YONA_E2E_FRONTEND_MODE: "preview",
          VITE_YONA_BASE_PATH: "/yona",
        }
      : {}),
  };
}

export function stylexVerificationBuildRequired(profileName) {
  return resolveStylexVerificationProfile(profileName).name === "final";
}

export function injectPreviewRuntimeConfig(html, basePath) {
  return html.replace(
    "<head>",
    `<head><script>window.__YONA_RUNTIME_CONFIG__ ||= {basePath:${JSON.stringify(basePath)}};</script>`,
  );
}

function usage() {
  return [
    "Usage: node scripts/stylex-verification-profile.mjs --profile fast -- <focused WTR spec paths>",
    "       node scripts/stylex-verification-profile.mjs --profile final -- .",
    "",
    "fast: target-level fallback-off validation for an active wave.",
    "final: final visual lock; also requires the documented legacy/global/build checks.",
  ].join("\n");
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const args = process.argv.slice(2);
  const profileIndex = args.indexOf("--profile");
  const profileName = profileIndex === -1 ? "fast" : args[profileIndex + 1];
  if (profileIndex !== -1 && !profileName) {
    throw new Error(usage());
  }

  const separatorIndex = args.indexOf("--");
  const forwardedArgs = args
    .slice(separatorIndex === -1 ? 0 : separatorIndex + 1)
    .filter((arg) => arg !== "--profile" && arg !== profileName);
  if (forwardedArgs.length === 0) {
    throw new Error(usage());
  }

  const profile = resolveStylexVerificationProfile(profileName);
  const env = { ...process.env, ...stylexVerificationEnvironment(profile.name) };
  console.log(`[stylex-harness] profile: ${profile.name}`);
  console.log(`[stylex-harness] required now: ${profile.required.join(", ")}`);
  if (profile.deferred.length > 0) {
    console.log(`[stylex-harness] deferred to final lock: ${profile.deferred.join(", ")}`);
  }

  if (stylexVerificationBuildRequired(profile.name)) {
    console.log("[stylex-harness] building fallback-off production frontend");
    const build = spawn(
      "pnpm",
      ["--config.store-dir=/Users/senghyunjo/.pnpm-store", "--dir", "frontend", "build"],
      {
        cwd: path.resolve(scriptDirectory, ".."),
        env,
        stdio: "inherit",
      },
    );
    const buildCode = await new Promise((resolve, reject) => {
      build.once("error", reject);
      build.once("exit", (exitCode, signal) => resolve(signal ? 1 : (exitCode ?? 1)));
    });
    if (buildCode !== 0) {
      return buildCode;
    }
    const indexPath = path.join(
      path.resolve(scriptDirectory, ".."),
      "frontend",
      "dist",
      "index.html",
    );
    const indexHtml = await readFile(indexPath, "utf8");
    await writeFile(indexPath, injectPreviewRuntimeConfig(indexHtml, "/yona"));
  }

  const child = spawn(
    process.execPath,
    [
      path.join(scriptDirectory, "run-wtr-e2e.mjs"),
      // WTR mounts frontend/dist (the fallback-off build built above); a
      // bare "." selects the whole in-browser suite.
      ...forwardedArgs.map((arg) => (arg === "." ? "tests/wtr/*.e2e.ts" : arg)),
    ],
    {
      cwd: path.resolve(scriptDirectory, ".."),
      env,
      stdio: "inherit",
    },
  );
  const code = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (exitCode, signal) => resolve(signal ? 1 : (exitCode ?? 1)));
  });
  return code;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    process.exit(await main());
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
