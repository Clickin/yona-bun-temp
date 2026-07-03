import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { currentSessionQueryOptions } from "../api/session";
import type { YonaRecord } from "../api/types";
import { YonaQueryProvider } from "../query-client";
import { type RuntimeConfig, prefixBasePath } from "../runtime-config";

export const Route = createFileRoute("/restricted")({
  component: RestrictedRoute,
});

function RestrictedRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <RestrictedScreen runtimeConfig={runtimeConfig} />
    </YonaQueryProvider>
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
              <Link to="/" className="logo logo-letter">
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
          <span className="provider">
            Copyright{" "}
            <Link
              to={"https://github.com/yona-projects/yona/blob/master/AUTHORS" as never}
              target="_blank"
              className="yona-author"
              activeProps={{ className: undefined }}
            >
              Yona authors
            </Link>{" "}
            & ©{" "}
            <Link
              to={"https://navercorp.com" as never}
              target="_blank"
              activeProps={{ className: undefined }}
            >
              NAVER Corp.
            </Link>{" "}
            &{" "}
            <Link
              to={"https://naverlabs.com/" as never}
              target="_blank"
              className="naver-labs"
              activeProps={{ className: undefined }}
            >
              NAVER LABS
            </Link>{" "}
            Supported by{" "}
            <Link
              to={"https://www.ncloud.com/?referer=yona" as never}
              target="_blank"
              className="naver-cloud-platform"
              activeProps={{ className: undefined }}
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
