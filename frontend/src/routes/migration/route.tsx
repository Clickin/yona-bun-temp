import { createFileRoute } from "@tanstack/react-router";
import { useAppRuntime } from "../../app-runtime-context";
import { type RuntimeConfig, prefixBasePath } from "../../runtime-config";
import { useDocumentTitle, useRequireAuthenticatedRoute } from "../-shared";

export const Route = createFileRoute("/migration")({
  component: MigrationRouteComponent,
});

export function MigrationDisabledPage({
  messages,
  runtimeConfig,
}: {
  messages: ReturnType<typeof useAppRuntime>["messages"];
  runtimeConfig: RuntimeConfig;
}) {
  const guideHref = prefixBasePath(runtimeConfig.basePath, "/sites/data");

  return (
    <main className="yobi-migration">
      <div className="header-pannel">
        <div className="comeback-text pull-right">
          Yona to Github<span className="midium-font"></span>
        </div>
        <div className="row title-text-bg">
          <div id="system-msg" className="well board">
            <div className="messages">
              {messages("error.forbidden.or.not.allowed", {
                fallback: "error.forbidden.or.not.allowed",
              })}
            </div>
          </div>
        </div>
        <div className="status">
          <div className="row">
            <div className="head-title row-fluid">
              <div className="source-title span5">
                <div className="project-name warn">Source 프로젝트를 선택해 주세요</div>
              </div>
              <div className="arrow span1">
                <i className="yobicon-arrow-right-alt"></i>
              </div>
              <div className="destination-title span6">
                <div className="project-name warn">Destination 프로젝트를 선택해 주세요</div>
              </div>
            </div>
          </div>
        </div>
        <div className="row source-destination">
          <div className="source-project span4">
            <div className="header">Source 0 개</div>
            <div className="search left-border">
              <input
                type="text"
                className="search-query"
                name="target-filter"
                placeholder="Search.."
                disabled
              />
            </div>
            <div className="left-project-list"></div>
          </div>
          <div className="destination-project span4">
            <div className="header">Destination 0 개</div>
            <div className="search">
              <input
                type="text"
                className="search-query"
                name="target-filter"
                placeholder="Search.."
                disabled
              />
            </div>
            <div className="destination-project-list"></div>
          </div>
          <div className="span6 status">
            <div className="progress row">
              <div className="bar span10 bar-danger" style={{ width: "0%" }}>
                0/0
              </div>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th colSpan={2}>Migration 대상</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="left-title">마일스톤</td>
                  <td className="left-title">0</td>
                  <td>
                    <div className="btn-group">
                      <button className="btn btn-danger" disabled>
                        마일스톤 옮기기
                      </button>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="left-title">이슈</td>
                  <td className="left-title">
                    <span>0</span>
                  </td>
                  <td>
                    <div className="btn-group">
                      <button className="btn btn-danger" disabled>
                        이슈 옮기기
                      </button>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="left-title">게시글</td>
                  <td className="left-title">
                    <span>0</span>
                  </td>
                  <td>
                    <div className="btn-group">
                      <button className="btn btn-danger" disabled>
                        게시글 옮기기
                      </button>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="td-title left-title">주의 사항!!</td>
                  <td colSpan={2} className="text-align-left">
                    <div className="caution">
                      작업 시작전에 Yona to Githbub 마이그레이션 가이드를 꼭 읽어주세요.
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="left-title">기존 이슈 담당자</div>
            <div className="caution">Migration 기능은 현재 사용할 수 없습니다.</div>
            <div className="caution">
              <a href={guideHref}>/sites/data</a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function MigrationRouteComponent() {
  const { messages, runtimeConfig } = useAppRuntime();
  const canRender = useRequireAuthenticatedRoute("/migration");
  useDocumentTitle(runtimeConfig.siteName ?? "Yona");

  if (!canRender) {
    return (
      <main className="app-shell">
        <h1>{messages("common.loading", { fallback: "common.loading" })}</h1>
      </main>
    );
  }

  return <MigrationDisabledPage messages={messages} runtimeConfig={runtimeConfig} />;
}
