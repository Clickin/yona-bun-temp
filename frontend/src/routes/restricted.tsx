import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, createLink, useRouter } from "@tanstack/react-router";
import { jsx as reactJsx } from "react/jsx-runtime";
import { currentSessionQueryOptions } from "../api/session";
import type { YonaRecord } from "../api/types";
import { YonaQueryProvider } from "../query-client";
import { type RuntimeConfig, prefixBasePath } from "../runtime-config";

export const Route = createFileRoute("/restricted")({
  component: RestrictedRoute,
});

const FOOTER_LINKS = {
  authors: "https://github.com/yona-projects/yona/blob/master/AUTHORS",
  naver: "https://navercorp.com",
  naverLabs: "https://naverlabs.com/",
  ncloud: "https://www.ncloud.com/?referer=yona",
} as const;
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

function LegacyRootLinkAnchor({
  legacyRootHref,
  href: _href,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<"a"> & {
  legacyRootHref: string;
  ref?: React.Ref<HTMLAnchorElement>;
}) {
  return reactJsx("a", { ...props, ref, href: legacyRootHref });
}

const LegacyRootLink = createLink(LegacyRootLinkAnchor);

function RestrictedRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <RestrictedScreen runtimeConfig={runtimeConfig} />
    </YonaQueryProvider>
  );
}

function RestrictedScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const router = useRouter();
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
  const homeHref = prefixBasePath(runtimeConfig.basePath, "/");
  const handleHomeClick = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      router.history.push(homeHref);
    },
    [homeHref, router.history],
  );

  return (
    <>
      <div className="unsupported hidden">
        <div className="unsupported-inner">
          <p id="unsupported-content" />
        </div>
      </div>
      <header className="gnb-outer">
        <div className="gnb-inner">
          <div className="pin" data-toggle="tooltip" data-placement="bottom" title="Sidebar">
            <i className="yobicon-arrow-left" />
            <i className="yobicon-arrow-right" />
          </div>
          <ul className="gnb-nav">
            <li>
              <LegacyRootLink
                activeOptions={legacyPlainLinkActiveOptions}
                activeProps={legacyPlainLinkActiveProps}
                className="logo logo-letter"
                legacyRootHref={homeHref}
                onClick={handleHomeClick}
                to="/"
              >
                Y
              </LegacyRootLink>
            </li>
            <li>
              <form
                action={prefixBasePath(runtimeConfig.basePath, "/search")}
                className="input-prepend gnb-search-form"
                name="gnb-search-form"
              >
                <input type="hidden" name="searchType" value="auto" />
                <div className="search-box">
                  {/* oxlint-disable-next-line jsx-a11y/no-access-key -- legacy siteLayout.scala.html renders accesskey="S" on the GNB search input. */}
                  <input type="text" name="keyword" autoComplete="off" accessKey="S" />
                  <button type="submit">
                    <i className="yobicon-search" />
                  </button>
                </div>
              </form>
            </li>
          </ul>
        </div>
      </header>
      <div className="page-wrap-outer">
        <div className="page-wrap">
          <h1>{"Sshhh" + "...don't tell anyone!"}</h1>
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
      <footer className="page-footer-outer">
        <div className="page-footer">
          <span className="provider">
            Copyright{" "}
            <Link
              href={FOOTER_LINKS.authors}
              to={FOOTER_LINKS.authors}
              reloadDocument
              target="_blank"
              className="yona-author"
              activeOptions={legacyPlainLinkActiveOptions}
              activeProps={legacyPlainLinkActiveProps}
            >
              Yona authors
            </Link>{" "}
            & ©{" "}
            <Link
              href={FOOTER_LINKS.naver}
              to={FOOTER_LINKS.naver}
              reloadDocument
              target="_blank"
              activeOptions={legacyPlainLinkActiveOptions}
              activeProps={legacyPlainLinkActiveProps}
            >
              NAVER Corp.
            </Link>{" "}
            &{" "}
            <Link
              href={FOOTER_LINKS.naverLabs}
              to={FOOTER_LINKS.naverLabs}
              reloadDocument
              target="_blank"
              className="naver-labs"
              activeOptions={legacyPlainLinkActiveOptions}
              activeProps={legacyPlainLinkActiveProps}
            >
              NAVER LABS
            </Link>{" "}
            Supported by{" "}
            <Link
              href={FOOTER_LINKS.ncloud}
              to={FOOTER_LINKS.ncloud}
              reloadDocument
              target="_blank"
              className="naver-cloud-platform"
              activeOptions={legacyPlainLinkActiveOptions}
              activeProps={legacyPlainLinkActiveProps}
            >
              NAVER CLOUD PLATFORM
            </Link>
          </span>
        </div>
      </footer>
    </>
  );
}

function asRecord(value: unknown): YonaRecord | undefined {
  return typeof value === "object" && value !== null ? (value as YonaRecord) : undefined;
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
