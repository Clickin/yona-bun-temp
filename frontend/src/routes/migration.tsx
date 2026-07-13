/* oxlint-disable jsx-a11y/tabindex-no-positive -- legacy migration/home.scala.html requires positive tab order on source/destination search inputs. */
import { createFileRoute } from "@tanstack/react-router";
import { LegacyI18nProvider, useLegacyMessages } from "../i18n";
import { YonaQueryProvider } from "../query-client";
import { SiteLayoutShell } from "./-home-route-screen";

export const Route = createFileRoute("/migration")({
  component: MigrationRoute,
});

function MigrationRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <>
      <title>{runtimeConfig.siteName ?? "Yona"}</title>
      <YonaQueryProvider>
        <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
          <SiteLayoutShell runtimeConfig={runtimeConfig}>
            <MigrationScreen />
          </SiteLayoutShell>
        </LegacyI18nProvider>
      </YonaQueryProvider>
    </>
  );
}

function MigrationScreen() {
  const { t } = useLegacyMessages();

  return (
    <div className="yobi-migration">
      <div className="header-pannel">
        <div className="comeback-text pull-right">
          Yona to Github
          <span className="midium-font" />
        </div>
        <div className="row title-text-bg">
          <div id="system-msg" className="well board">
            <div className="messages">{t("error.forbidden.or.not.allowed")}</div>
          </div>
        </div>
        <div className="status">
          <div className="row">
            <div className="head-title row-fluid">
              <div className="source-title span5">
                <div className="project-name warn">Source 프로젝트를 선택해 주세요</div>
              </div>
              <div className="arrow span1">
                <i className="yobicon-arrow-right-alt" />
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
                tabIndex={1}
                type="text"
                className="search-query"
                name="target-filter"
                placeholder="Search.."
                disabled
              />
            </div>
            <div className="left-project-list" />
          </div>
          <div className="destination-project span4">
            <div className="header">Destination 0 개</div>
            <div className="search">
              <input
                type="text"
                tabIndex={2}
                className="search-query"
                name="target-filter"
                placeholder="Search.."
                disabled
              />
            </div>
            <div className="destination-project-list" />
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
                  <th />
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
            <div />
          </div>
        </div>
      </div>
    </div>
  );
}
