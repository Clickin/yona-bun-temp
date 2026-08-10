/* oxlint-disable jsx-a11y/tabindex-no-positive -- legacy migration/home.scala.html requires positive tab order on source/destination search inputs. */
import { createFileRoute } from "@tanstack/react-router";
import { LegacyI18nProvider, useLegacyMessages } from "../i18n";
import { YoramQueryProvider } from "../query-client";
import { SiteLayoutShell } from "./-home-route-screen";
export const Route = createFileRoute("/migration")({
  component: MigrationRoute,
});

function MigrationRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <>
      <title>{runtimeConfig.siteName ?? "Yoram"}</title>
      <YoramQueryProvider>
        <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
          <SiteLayoutShell runtimeConfig={runtimeConfig}>
            <MigrationScreen />
          </SiteLayoutShell>
        </LegacyI18nProvider>
      </YoramQueryProvider>
    </>
  );
}

function MigrationScreen() {
  return (
    <div
      className={"yobi-migration"}
      data-owner="migration-disabled-shell"
      data-page-owner="migration-page"
    >
      <div className="header-pannel" data-owner="migration-layout">
        <MigrationComebackHeader />
        <MigrationSourceDestinationGrid />
      </div>
    </div>
  );
}

function MigrationComebackHeader() {
  const { t } = useLegacyMessages();
  return (
    <>
      <div className={"comeback-text pull-right"} data-part="migration-disabled-comeback">
        Yona to Github
        <span className={"midium-font"} />
      </div>
      <div className={"row title-text-bg"}>
        <div id="system-msg" className={"well board"}>
          <div className="messages" data-owner="migration-notice">
            {t("error.forbidden.or.not.allowed")}
          </div>
        </div>
      </div>
      <div className="status">
        <div className={"row"}>
          <div className={"head-title row-fluid"}>
            <div className={"source-title span5"}>
              <div className={"project-name warn"}>Source 프로젝트를 선택해 주세요</div>
            </div>
            <div className={"arrow span1"}>
              <i className={"yobicon-arrow-right-alt"} />
            </div>
            <div className={"destination-title span6"}>
              <div className={"project-name warn"}>Destination 프로젝트를 선택해 주세요</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function MigrationProjectPane({
  side,
  tabIndex,
}: {
  side: "source" | "destination";
  tabIndex: number;
}) {
  const isSource = side === "source";
  const content = (
    <>
      <div className={"header"}>{isSource ? "Source 0 개" : "Destination 0 개"}</div>
      <div className={isSource ? `search left-border ` : `search `}>
        <input
          tabIndex={tabIndex}
          type="text"
          className={"search-query"}
          name="target-filter"
          placeholder="Search.."
          disabled
        />
      </div>
      {isSource ? (
        <div className={"left-project-list"} />
      ) : (
        <div className={"destination-project-list"} />
      )}
    </>
  );
  return isSource ? (
    <div className={"source-project span4"} data-owner="migration-source-column-grid">
      {content}
    </div>
  ) : (
    <div className={"destination-project span4"} data-owner="migration-destination-column-grid">
      {content}
    </div>
  );
}

function MigrationStatusTable() {
  return (
    <>
      <table className={"table"}>
        <thead>
          <tr>
            <th colSpan={2}>Migration 대상</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={"left-title"}>마일스톤</td>
            <td className={"left-title"}>0</td>
            <td>
              <div className={"btn-group"}>
                <button className={"btn btn-danger"} disabled>
                  마일스톤 옮기기
                </button>
              </div>
            </td>
          </tr>
          <tr>
            <td className={"left-title"}>이슈</td>
            <td className={"left-title"}>
              <span>0</span>
            </td>
            <td>
              <div className={"btn-group"}>
                <button className={"btn btn-danger"} disabled>
                  이슈 옮기기
                </button>
              </div>
            </td>
          </tr>
          <tr>
            <td className={"left-title"}>게시글</td>
            <td className={"left-title"}>
              <span>0</span>
            </td>
            <td>
              <div className={"btn-group"}>
                <button className={"btn btn-danger"} disabled>
                  게시글 옮기기
                </button>
              </div>
            </td>
          </tr>
          <tr>
            <td className={"td-title left-title"}>주의 사항!!</td>
            <td colSpan={2} className={"text-align-left"}>
              <div className={"caution"}>
                작업 시작전에 Yona to Githbub 마이그레이션 가이드를 꼭 읽어주세요.
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div className={"left-title"}>기존 이슈 담당자</div>
      <div />
    </>
  );
}

function MigrationSourceDestinationGrid() {
  return (
    <div className={"row source-destination"} data-owner="migration-source-destination-row">
      <MigrationProjectPane side="source" tabIndex={1} />
      <MigrationProjectPane side="destination" tabIndex={2} />
      <div className={"span6 status"} data-owner="migration-status-column-grid">
        <div className={"progress row"}>
          <div className={"bar span10 bar-danger"} data-owner="migration-progress-bar">
            0/0
          </div>
        </div>
        <MigrationStatusTable />
      </div>
    </div>
  );
}
