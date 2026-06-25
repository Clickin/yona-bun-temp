import { createFileRoute } from "@tanstack/react-router";
import { useAppRuntime } from "../../app-runtime-context";
import { prefixBasePath } from "../../runtime-config";
import { useDocumentTitle } from "../-shared";

export const Route = createFileRoute("/restart")({
  component: RestartNoticeRouteComponent,
});

function RestartNoticeRouteComponent() {
  const { messages, runtimeConfig } = useAppRuntime();
  const siteName = runtimeConfig.siteName || "Yona";
  useDocumentTitle("app.restart.welcome");

  return (
    <main className="secret-page">
      <div className="page-wrap-outer">
        <div className="container page-wrap">
          <div className="page">
            <div className="secret-wrap restart">
              <a className="logo" href={prefixBasePath(runtimeConfig.basePath, "/")}>
                <span>{siteName}</span>
              </a>
              <h3>{messages("app.restart.welcome", { fallback: "app.restart.welcome" })}</h3>
              <p className="secret-box txt-center">
                {messages("app.restart.notice", { fallback: "app.restart.notice" })}
              </p>
            </div>
          </div>
        </div>
      </div>
      <footer className="page-footer-outer">
        <div className="page-footer">
          <span className="provider">
            Powered by <strong>{siteName}</strong>
          </span>
        </div>
      </footer>
    </main>
  );
}
