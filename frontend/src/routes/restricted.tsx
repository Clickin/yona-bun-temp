import * as React from "react";
import * as stylex from "@stylexjs/stylex";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { currentSessionQueryOptions } from "../api/session";
import type { YoramRecord } from "../api/types";
import { YoramQueryProvider } from "../query-client";
import { type RuntimeConfig, prefixBasePath } from "../runtime-config";
import { globalColors } from "../theme.stylex";

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
      <header className="gnb-outer">
        <div className="gnb-inner">
          <div
            {...stylex.props(restrictedSidebarPinStyles.root)}
            data-stylex-owner="restricted-sidebar-pin"
            title="Sidebar"
          >
            <i
              className={`yobicon-arrow-left ${stylex.props(restrictedSidebarPinStyles.icon).className}`}
            />
            <i
              className={`yobicon-arrow-right ${stylex.props(restrictedSidebarPinStyles.icon, restrictedSidebarPinStyles.visibleIcon).className}`}
            />
          </div>
          <ul className="gnb-nav">
            <li>
              <Link
                activeOptions={legacyPlainLinkActiveOptions}
                activeProps={legacyPlainLinkActiveProps}
                className="logo logo-letter"
                to="/"
              >
                Y
              </Link>
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
          <span className="provider">Yoram authors</span>
        </div>
      </footer>
    </>
  );
}

const restrictedSidebarPinStyles = stylex.create({
  root: {
    appearance: "none",
    backgroundColor: globalColors.globalSidebarOpenPinSurface,
    borderBottomColor: globalColors.globalSidebarOpenPinText,
    borderBottomStyle: "none",
    borderBottomWidth: globalColors.globalSidebarOpenPinBorderWidth,
    borderLeftColor: globalColors.globalSidebarOpenPinText,
    borderLeftStyle: "none",
    borderLeftWidth: globalColors.globalSidebarOpenPinBorderWidth,
    borderRadius: globalColors.globalSidebarOpenPinRadius,
    borderRightColor: globalColors.globalSidebarOpenPinText,
    borderRightStyle: "none",
    borderRightWidth: globalColors.globalSidebarOpenPinBorderWidth,
    borderTopColor: globalColors.globalSidebarOpenPinText,
    borderTopStyle: "none",
    borderTopWidth: globalColors.globalSidebarOpenPinBorderWidth,
    boxShadow: "none",
    boxSizing: "content-box",
    color: globalColors.globalSidebarOpenPinText,
    cursor: {
      default: "auto",
      ":hover": "pointer",
    },
    display: "inline-block",
    fontSize: globalColors.globalSidebarOpenPinFontSize,
    left: globalColors.globalSidebarOpenPinLeft,
    lineHeight: globalColors.globalSidebarOpenPinLineHeight,
    margin: globalColors.globalSidebarOpenPinMargin,
    padding: globalColors.globalSidebarOpenPinPadding,
    position: "absolute",
    textAlign: "start",
    top: globalColors.globalSidebarOpenPinTop,
  },
  icon: {
    color: {
      default: "inherit",
      ":hover": globalColors.globalSidebarOpenPinInteractionText,
    },
    cursor: {
      default: "inherit",
      ":hover": "pointer",
    },
    display: "none",
    fontSize: globalColors.globalSidebarOpenPinFontSize,
    padding: globalColors.globalSidebarOpenPinIconPadding,
  },
  visibleIcon: {
    display: "block",
  },
});

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
