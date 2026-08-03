import * as React from "react";
import * as stylex from "@stylexjs/stylex";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

type ExternalLinkTarget = NonNullable<React.ComponentProps<typeof Link>["to"]>;
import { currentSessionQueryOptions } from "../api/session";
import type { YoramRecord } from "../api/types";
import { YoramQueryProvider } from "../query-client";
import { type RuntimeConfig, prefixBasePath } from "../runtime-config";
import { restrictedTheme } from "./-restricted.stylex";

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
      <header {...stylex.props(restrictedGnbStyles.outer)} data-stylex-owner="restricted-gnb-outer">
        <div {...stylex.props(restrictedGnbStyles.inner)} data-stylex-owner="restricted-gnb-inner">
          <div
            {...stylex.props(restrictedSidebarPinStyles.root)}
            data-stylex-owner="restricted-sidebar-pin"
            title="Sidebar"
          >
            <i
              className={`yobicon-arrow-left ${stylex.props(restrictedSidebarPinStyles.icon, restrictedSidebarPinStyles.leftIcon).className}`}
            />
            <i
              className={`yobicon-arrow-right ${stylex.props(restrictedSidebarPinStyles.icon, restrictedSidebarPinStyles.rightIcon, restrictedSidebarPinStyles.visibleIcon).className}`}
            />
          </div>
          <ul {...stylex.props(restrictedGnbStyles.nav)} data-stylex-owner="restricted-gnb-nav">
            <li {...stylex.props(restrictedGnbStyles.item)}>
              <Link
                activeOptions={legacyPlainLinkActiveOptions}
                activeProps={legacyPlainLinkActiveProps}
                {...stylex.props(restrictedGnbStyles.brand)}
                data-stylex-owner="restricted-gnb-brand"
                to="/"
              >
                Y
              </Link>
            </li>
            <li {...stylex.props(restrictedGnbStyles.item)}>
              <form
                action={prefixBasePath(runtimeConfig.basePath, "/search")}
                {...stylex.props(restrictedGnbStyles.searchForm)}
                data-stylex-owner="restricted-gnb-search-form"
                name="gnb-search-form"
              >
                <input type="hidden" name="searchType" value="auto" />
                <div
                  {...stylex.props(restrictedGnbStyles.searchBox)}
                  data-stylex-owner="restricted-gnb-search-box"
                >
                  {/* oxlint-disable-next-line jsx-a11y/no-access-key -- legacy siteLayout.scala.html renders accesskey="S" on the GNB search input. */}
                  <input
                    {...stylex.props(restrictedGnbStyles.searchInput)}
                    accessKey="S"
                    autoComplete="off"
                    data-stylex-owner="restricted-gnb-search-input"
                    name="keyword"
                    type="text"
                  />
                  <button
                    {...stylex.props(restrictedGnbStyles.searchSubmit)}
                    data-stylex-owner="restricted-gnb-search-submit"
                    type="submit"
                  >
                    <i className="yobicon-search" />
                  </button>
                </div>
              </form>
            </li>
          </ul>
        </div>
      </header>
      <div className="page-wrap-outer" data-stylex-owner="restricted-page">
        <div className="page-wrap" data-stylex-owner="restricted-content">
          <h1 data-stylex-owner="restricted-copy">{"Sshhh" + "...don't tell anyone!"}</h1>
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
      <footer className="page-footer-outer" data-stylex-owner="restricted-footer">
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

const restrictedSidebarPinStyles = stylex.create({
  root: {
    appearance: "none",
    backgroundColor: restrictedTheme.sidebarPinSurface,
    borderBottomColor: restrictedTheme.sidebarPinText,
    borderBottomStyle: "none",
    borderBottomWidth: "0px",
    borderLeftColor: restrictedTheme.sidebarPinText,
    borderLeftStyle: "none",
    borderLeftWidth: "0px",
    borderRadius: "0 3px 3px 0",
    borderRightColor: restrictedTheme.sidebarPinText,
    borderRightStyle: "none",
    borderRightWidth: "0px",
    borderTopColor: restrictedTheme.sidebarPinText,
    borderTopStyle: "none",
    borderTopWidth: "0px",
    boxShadow: "none",
    boxSizing: "content-box",
    color: restrictedTheme.sidebarPinText,
    cursor: {
      default: "auto",
      ":hover": "pointer",
    },
    display: "inline-block",
    fontSize: "18px",
    left: "-6px",
    lineHeight: "20px",
    margin: "0 5px 0 0",
    padding: "0 1px",
    position: "absolute",
    textAlign: "start",
    top: "6px",
  },
  icon: {
    color: {
      default: "inherit",
      ":hover": restrictedTheme.sidebarPinInteractionText,
    },
    cursor: {
      default: "inherit",
      ":hover": "pointer",
    },
    display: "none",
    fontFamily: "yobicon",
    fontSize: "18px",
    fontStyle: "normal",
    fontVariant: "normal",
    fontWeight: "400",
    lineHeight: "1",
    padding: "4px 0 4px 5px",
    textDecoration: "none",
    verticalAlign: "baseline",
  },
  leftIcon: {
    "::before": {
      content: '"\\e031"',
    },
  },
  rightIcon: {
    "::before": {
      content: '"\\e030"',
    },
  },
  visibleIcon: {
    display: "block",
  },
});

// Frozen common/navbar.scala.html and _page.less:111-130,198-203,240-295,421-471.
const restrictedGnbStyles = stylex.create({
  outer: {
    backgroundColor: restrictedTheme.gnbOuterSurface,
    boxSizing: "border-box",
    height: "40px",
    minWidth: {
      default: "0px",
      "@media (max-width: 720px)": "10px",
    },
    paddingBlock: "0px",
    paddingInline: "10px",
  },
  inner: {
    boxSizing: "content-box",
    color: restrictedTheme.gnbInnerText,
    height: "40px",
    margin: "0px auto",
    width: "98%",
  },
  nav: {
    boxSizing: "content-box",
    color: restrictedTheme.gnbNavText,
    display: "block",
    float: "left",
    fontSize: "14px",
    fontWeight: "400",
    lineHeight: "20px",
    listStyle: "none",
    margin: "0px 0px 0px 15px",
    padding: "0px",
  },
  item: {
    float: "left",
    position: "relative",
  },
  brand: {
    backgroundColor: restrictedTheme.gnbBrandSurface,
    backgroundPosition: "11px 10px",
    backgroundRepeat: "no-repeat",
    borderRadius: "2px",
    color: restrictedTheme.gnbBrandText,
    display: "inline",
    float: "none",
    fontSize: "14px",
    fontWeight: "700",
    height: "40px",
    lineHeight: "40px",
    opacity: "0.7",
    outlineStyle: "none",
    paddingBlock: "6px",
    paddingInline: "10px",
    textDecoration: "none",
    transitionDuration: "0.15s",
    transitionProperty: "color",
    width: "44px",
    ":focus": {
      color: restrictedTheme.gnbBrandText,
      opacity: "0.7",
      outlineStyle: "none",
      textDecoration: "none",
    },
    ":hover": {
      color: restrictedTheme.gnbBrandInteractionText,
      opacity: "1",
      outlineStyle: "none",
      textDecoration: "none",
    },
    "::before": {
      content: '" "',
      float: "left",
      height: "40px",
      width: "1px",
    },
    "::after": {
      content: '" "',
      float: "left",
      height: "40px",
      marginLeft: {
        default: "40px",
        "@media (max-width: 720px)": "0px",
      },
      width: "1px",
    },
  },
  searchForm: {
    display: {
      default: "inline-block",
      // Frozen _responsive.less:269-271 hides legacy .gnb-search-form at max 720px.
      "@media (max-width: 720px)": "none",
    },
    fontSize: "0px",
    lineHeight: "30px",
    margin: "5px 0px 0px",
    paddingBlock: "0px",
    paddingInline: "10px",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
  },
  searchBox: {
    backgroundColor: restrictedTheme.gnbSearchBoxSurface,
    borderRadius: "3px",
    boxSizing: "content-box",
    display: "inline-block",
    height: "30px",
    verticalAlign: "middle",
  },
  searchInput: {
    backgroundColor: restrictedTheme.gnbSearchInputSurface,
    borderColor: {
      default: restrictedTheme.gnbSearchInputText,
      ":focus": restrictedTheme.gnbSearchInputFocusBorder,
    },
    borderStyle: "none",
    borderWidth: "0px",
    boxShadow: "none",
    boxSizing: "content-box",
    color: restrictedTheme.gnbSearchInputText,
    display: "inline-block",
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    fontSize: "12px",
    fontWeight: "400",
    height: "20px",
    lineHeight: "30px",
    margin: "0px 0px 3px",
    maxWidth: {
      default: "none",
      ":focus": "250px",
    },
    minHeight: "0px",
    outlineStyle: "none",
    outlineWidth: "0px",
    padding: "5px 10px",
    position: "relative",
    transitionDuration: "0.3s",
    transitionProperty: "width",
    transitionTimingFunction: "ease",
    verticalAlign: "top",
    width: {
      default: "50px",
      ":focus": "200px",
    },
    zIndex: {
      default: "auto",
      ":focus": "2",
    },
  },
  searchSubmit: {
    appearance: "button",
    backgroundColor: "transparent",
    borderColor: restrictedTheme.gnbSearchSubmitText,
    borderStyle: "none",
    borderWidth: "0px",
    boxShadow: "none",
    boxSizing: "border-box",
    color: restrictedTheme.gnbSearchSubmitText,
    cursor: "pointer",
    display: "inline-block",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
    fontSize: "12px",
    fontWeight: "400",
    lineHeight: "20px",
    margin: "5px",
    minHeight: "0px",
    outlineStyle: "none",
    outlineWidth: "0px",
    padding: "0px",
    textAlign: "center",
    verticalAlign: "middle",
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
