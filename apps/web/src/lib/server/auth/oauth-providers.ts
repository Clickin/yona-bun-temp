import * as arctic from "arctic";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

const githubClientId = requireEnv("GITHUB_CLIENT_ID");
const githubClientSecret = requireEnv("GITHUB_CLIENT_SECRET");
const githubRedirectUri = requireEnv("GITHUB_REDIRECT_URI");
const googleClientId = requireEnv("GOOGLE_CLIENT_ID");
const googleClientSecret = requireEnv("GOOGLE_CLIENT_SECRET");
const googleRedirectUri = requireEnv("GOOGLE_REDIRECT_URI");

export const github = new arctic.GitHub(githubClientId, githubClientSecret, githubRedirectUri);
export const google = new arctic.Google(googleClientId, googleClientSecret, googleRedirectUri);
