import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

type ExternalLinkTarget = NonNullable<React.ComponentProps<typeof Link>["to"]>;
import { currentSessionQueryOptions } from "../api/session";
import type { YoramRecord } from "../api/types";
import { YoramQueryProvider } from "../query-client";
import { type RuntimeConfig, prefixBasePath } from "../runtime-config";
export const Route = createFileRoute("/restricted")({
  component: RestrictedRoute,
});

const legacyPlainLinkActiveOptions = {
  exact: true,
  explicitUndefined: true,
  includeHash: true,
  includeSearch: true,
} as const;
const legacyPlainLinkActiveProps = {
  "aria-current": undefined,
  className: undefined,
  "data-status": undefined,
};

function RestrictedRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YoramQueryProvider>
      <RestrictedScreen runtimeConfig={runtimeConfig} />
    </YoramQueryProvider>
  );
}

function RestrictedScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const sessionQuery = useQuery(currentSessionQueryOptions(runtimeConfig));
  const session = asRecord(sessionQuery.data) ?? {};
  const localUser = asRecord(session.localUser) ?? asRecord(session.user);
  const currentAuth = asRecord(session.currentAuth) ?? asRecord(session.auth);
  const name = stringValue(localUser?.name) || stringValue(localUser?.displayName) || "";
  const email = stringValue(localUser?.email) || stringValue(localUser?.primaryEmailAddress) || "";
  const emailValidated = booleanValue(localUser?.emailValidated);
  const provider = stringValue(currentAuth?.provider) || "password";
  const authId = stringValue(currentAuth?.id) || stringValue(localUser?.loginId) || "";
  const expires = numberValue(currentAuth?.expires, -1);
  const browserTitle = runtimeConfig.siteName ?? "Yoram";

  return (
    <>
      <title>{browserTitle}</title>
      <div className="unsupported hidden">
        <div className="unsupported-inner">
          <p id="unsupported-content" />
        </div>
      </div>
      <header data-owner="restricted-gnb-outer">
        <div data-owner="restricted-gnb-inner">
          <div data-owner="restricted-sidebar-pin" title="Sidebar">
            <i className={"yobicon-arrow-left"} />
            <i className={"yobicon-arrow-right"} />
          </div>
          <ul data-owner="restricted-gnb-nav">
            <li>
              <Link
                activeOptions={legacyPlainLinkActiveOptions}
                activeProps={legacyPlainLinkActiveProps}
                className="logo"
                data-owner="restricted-gnb-brand"
                to="/"
              >
                Y
              </Link>
            </li>
            <li>
              <form
                action={prefixBasePath(runtimeConfig.basePath, "/search")}
                data-owner="restricted-gnb-search-form"
                name="gnb-search-form"
              >
                <input type="hidden" name="searchType" value="auto" />
                <div data-owner="restricted-gnb-search-box">
                  {/* oxlint-disable-next-line jsx-a11y/no-access-key -- legacy siteLayout.scala.html renders accesskey="S" on the GNB search input. */}
                  <input
                    autoComplete="off"
                    data-owner="restricted-gnb-search-input"
                    name="keyword"
                    type="text"
                  />
                  <button data-owner="restricted-gnb-search-submit" type="submit">
                    <i className="yobicon-search" />
                  </button>
                </div>
              </form>
            </li>
          </ul>
        </div>
      </header>
      <div className="page-wrap-outer" data-owner="restricted-page">
        <div className="page-wrap" data-owner="restricted-content">
          <h1 data-owner="restricted-copy">{"Sshhh" + "...don't tell anyone!"}</h1>
          <p>
            <iframe
              title="Gangnam Style"
              width="560"
              height="315"
              src="https://www.youtube.com/embed/9bZkp7q19f0"
              frameBorder="0"
              allowFullScreen
            />
          </p>
          <p>
            {`Your name is ${name} and your email address is ${email}`}
            <i>{emailValidated ? "(verified)" : "(unverified)"}</i>!
            <br />
            {`Logged in with provider '${provider}' and the user ID '${authId}'`}
            <br />
            {`Your session expires ${expires === -1 ? "never" : `at ${expires} (UNIX timestamp)`}`}
          </p>
        </div>
      </div>
      <footer className="page-footer-outer" data-owner="restricted-footer">
        <div className="page-footer">
          <span className="provider">
            Copyright{" "}
            <Link
              className="yona-author"
              href="https://github.com/yona-projects/yona/blob/master/AUTHORS"
              rel="noreferrer"
              target="_blank"
              to={
                "https://github.com/yona-projects/yona/blob/master/AUTHORS" as unknown as ExternalLinkTarget
              }
            >
              Yona authors
            </Link>{" "}
            & ©{" "}
            <Link
              href="https://navercorp.com"
              rel="noreferrer"
              target="_blank"
              to={"https://navercorp.com" as unknown as ExternalLinkTarget}
            >
              NAVER Corp.
            </Link>{" "}
            &{" "}
            <Link
              className="naver-labs"
              href="https://naverlabs.com/"
              rel="noreferrer"
              target="_blank"
              to={"https://naverlabs.com/" as unknown as ExternalLinkTarget}
            >
              NAVER LABS
            </Link>{" "}
            Supported by{" "}
            <Link
              className="naver-cloud-platform"
              href="https://www.ncloud.com/?referer=yona"
              rel="noreferrer"
              target="_blank"
              to={"https://www.ncloud.com/?referer=yona" as unknown as ExternalLinkTarget}
            >
              NAVER CLOUD PLATFORM
            </Link>
          </span>
        </div>
      </footer>
    </>
  );
}

// Frozen common/navbar.scala.html and _page.less:111-130,198-203,240-295,421-471.
function asRecord(value: unknown): YoramRecord | undefined {
  return typeof value === "object" && value !== null ? (value as YoramRecord) : undefined;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function booleanValue(value: unknown): boolean {
  return value === true || value === "true" || value === 1;
}

function numberValue(value: unknown, fallback: number): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}
