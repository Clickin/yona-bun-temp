import { prefixBasePath, type RuntimeConfig } from "../runtime-config";

function appHref(runtimeConfig: RuntimeConfig, href: string): string {
  return prefixBasePath(runtimeConfig.basePath, href);
}

export function HomePage({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  return (
    <main className="app-shell">
      <p className="eyebrow">Yona Rust Frontend</p>
      <h1>Legacy Route Foundation</h1>
      <p className="lede">
        Wave 0 restores the public entry points and canonical auth paths on the Rust
        file route tree.
      </p>
      <div className="runtime-grid">
        <div>
          <a href={appHref(runtimeConfig, "/users/loginform")}>Login</a>
        </div>
        <div>
          <a href={appHref(runtimeConfig, "/users/signupform")}>Sign up</a>
        </div>
        <div>
          <a href={appHref(runtimeConfig, "/lostPassword")}>Forgot password</a>
        </div>
        <div>
          <a href={appHref(runtimeConfig, "/resetPassword")}>Reset password</a>
        </div>
        <div>
          <a href={appHref(runtimeConfig, "/projects")}>Project List</a>
        </div>
        <div>
          <a href={appHref(runtimeConfig, "/orgs")}>Organization List</a>
        </div>
        <div>
          <a href={appHref(runtimeConfig, "/search?pageSize=20&scope=global")}>Search</a>
        </div>
      </div>
    </main>
  );
}
