import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const STYLEX_VERIFICATION_PROFILES = Object.freeze({
  fast: Object.freeze({
    name: "fast",
    required: ["focused fallback-off Playwright", "desktop/mobile target metrics", "source and provenance checks"],
    deferred: ["live legacy screenshot pair", "global fallback consumer audit", "full fallback-off suite", "production build"],
  }),
  final: Object.freeze({
    name: "final",
    required: [
      "focused fallback-off Playwright",
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
    PW_CHANNEL: "chrome",
  };
}

function usage() {
  return [
    "Usage: node scripts/stylex-verification-profile.mjs --profile fast -- <focused Playwright args>",
    "       node scripts/stylex-verification-profile.mjs --profile final -- <final Playwright args>",
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
  const forwardedArgs = args.slice(separatorIndex === -1 ? 0 : separatorIndex + 1).filter((arg) => arg !== "--profile" && arg !== profileName);
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

  const child = spawn(process.execPath, [path.join(scriptDirectory, "run-playwright-e2e.mjs"), ...forwardedArgs], {
    cwd: path.resolve(scriptDirectory, ".."),
    env,
    stdio: "inherit",
  });
  const code = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (exitCode, signal) => resolve(signal ? 1 : exitCode ?? 1));
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
