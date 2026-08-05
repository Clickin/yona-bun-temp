/* oxlint-disable jsx-a11y/tabindex-no-positive -- legacy migration/home.scala.html requires positive tab order on source/destination search inputs. */
import * as stylex from "@stylexjs/stylex";
import { createFileRoute } from "@tanstack/react-router";
import { LegacyI18nProvider, useLegacyMessages } from "../i18n";
import { YoramQueryProvider } from "../query-client";
import { SiteLayoutShell } from "./-home-route-screen";
import { migrationTheme } from "./-migration.stylex";

const styles = stylex.create({
  disabledShell: {
    "--yoram-stylex-migration-disabled-shell": "stylex",
    lineHeight: "20px",
  },
  comeback: {
    backgroundColor: migrationTheme.comebackSurface,
    color: migrationTheme.comebackText,
    fontFamily: "Muli, sans-serif",
    fontSize: "30px",
    textAlign: "right",
    marginRight: "20px",
    marginTop: "25px",
  },
  comebackDetail: { fontSize: "14px" },
  titleTextBg: {
    backgroundColor: migrationTheme.titleSurface,
    borderTopColor: migrationTheme.titleBorderTop,
    borderBottomColor: migrationTheme.titleBorderBottom,
    borderTopStyle: "solid",
    borderBottomStyle: "solid",
    borderTopWidth: "1px",
    borderBottomWidth: "1px",
  },
  legacyRow: {
    marginLeft: "-20px",
    "::before": { content: '""', display: "table", lineHeight: "0px" },
    "::after": { clear: "both", content: '""', display: "table", lineHeight: "0px" },
  },
  board: {
    fontSize: "14px",
    minHeight: "20px",
    maxHeight: "60px",
    overflow: "hidden",
    backgroundColor: migrationTheme.boardSurface,
    color: migrationTheme.boardText,
    borderRadius: "0px",
    marginBottom: "0px",
    borderStyle: "none",
    borderWidth: "0px",
    boxShadow: "inset 0 1px 1px rgba(0, 0, 0, 0.05)",
    paddingTop: "19px",
    paddingRight: "19px",
    paddingBottom: "19px",
    paddingLeft: "40px",
  },
  headTitle: {
    backgroundColor: migrationTheme.headTitleSurface,
    paddingBottom: "0px",
    wordWrap: "break-word",
    height: "60px",
  },
  sourceTitle: { textAlign: "right" },
  destinationTitle: {
    textAlign: "left",
    paddingLeft: "8px",
  },
  projectWarn: {
    color: migrationTheme.projectWarnText,
    fontSize: "20px",
    marginTop: "4px",
    padding: "5px 10px",
    fontWeight: "700",
    fontFamily: "Consolas, monospace, Menlo",
    lineHeight: "normal",
    backgroundColor: migrationTheme.projectWarnSurface,
  },
  arrow: {
    textAlign: "center",
    color: migrationTheme.arrowText,
  },
  arrowIcon: {
    backgroundImage: "none",
    display: "inline-block",
    fontFamily: "yobicon",
    fontSize: "20px",
    fontStyle: "normal",
    fontVariant: "normal",
    fontWeight: "normal",
    lineHeight: 1,
    padding: "10px",
    textDecoration: "none",
    verticalAlign: "baseline",
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
    "::before": { content: '"\\e01c"' },
  },
  sourceDestination: {
    // `_migration.less` adds the source-destination row's +20px offset. The
    // retired `.yobi-migration .row` fallback supplied -20px only to the
    // generic Bootstrap row shell; keep this route-specific net geometry on
    // the active migration row after that fallback is removed.
    marginLeft: "20px",
    "::before": { content: '""', display: "table", lineHeight: "0px" },
    "::after": { clear: "both", content: '""', display: "table", lineHeight: "0px" },
  },
  migrationColumn: {
    float: "left",
    minHeight: "1px",
    marginLeft: "20px",
  },
  migrationSpan6: { width: "460px" },
  migrationSpan4: { width: "300px" },
  paneHeader: {
    padding: "10px",
    backgroundColor: migrationTheme.paneHeaderSurface,
    fontWeight: "700",
    fontSize: "16px",
    color: migrationTheme.paneHeaderText,
  },
  search: {
    borderRightColor: migrationTheme.searchBorder,
    borderStyle: "solid",
    borderRightWidth: "1px",
    borderBottomWidth: "0px",
    borderTopWidth: "0px",
    borderLeftWidth: "0px",
    height: "40px",
  },
  searchInput: {
    backgroundColor: "#eeeeee",
    display: "inline-block",
    width: "206px",
    borderStyle: "none",
    borderWidth: "0px",
    borderRadius: "2px",
    boxShadow: "none",
    color: "#555555",
    height: "30px",
    fontSize: "18px",
    lineHeight: "20px",
    marginBottom: "0px",
    paddingTop: "4px",
    paddingRight: "14px",
    paddingBottom: "4px",
    paddingLeft: "14px",
    verticalAlign: "middle",
  },
  projectList: {
    height: "60vh",
    overflow: "auto",
    borderColor: migrationTheme.projectListBorder,
    borderStyle: "solid",
    borderWidth: "1px",
  },
  destinationProject: { marginLeft: "0px" },
  destinationProjectList: {
    borderLeftWidth: "0px",
  },
  progress: {
    backgroundColor: "#f7f7f7",
    backgroundImage: "linear-gradient(to bottom, #f5f5f5, #f9f9f9)",
    backgroundRepeat: "repeat-x",
    borderRadius: "0px",
    boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.1)",
    height: "20px",
    marginBottom: "0px",
    marginLeft: "0px",
    overflow: "hidden",
  },
  progressBar: {
    backgroundColor: "#dd514c",
    backgroundImage: "linear-gradient(to bottom, #ee5f5b, #c43c35)",
    backgroundRepeat: "repeat-x",
    boxShadow: "inset 0 -1px 0 rgba(0, 0, 0, 0.15)",
    boxSizing: "border-box",
    color: "#ffffff",
    float: "left",
    fontSize: "12px",
    height: "100%",
    marginLeft: "0px",
    textAlign: "center",
    textShadow: "0 -1px 0 rgba(0, 0, 0, 0.25)",
    transition: "width 0.6s ease",
    width: "0%",
  },
  statusTable: {
    backgroundColor: "transparent",
    borderCollapse: "collapse",
    borderSpacing: "0px",
    marginBottom: "20px",
    maxWidth: "100%",
    width: "100%",
  },
  statusTableCell: {
    borderTopColor: "#dddddd",
    borderTopStyle: "solid",
    borderTopWidth: "1px",
    lineHeight: "20px",
    padding: "8px",
  },
  statusTableHeaderCell: {
    fontWeight: "700",
    textAlign: "left",
    verticalAlign: "bottom",
  },
  firstStatusTableHeaderCell: {
    borderTopWidth: "0px",
  },
  statusTableDataCell: {
    textAlign: "center",
    verticalAlign: "middle",
  },
  leftTitle: {
    fontSize: "14px",
    fontWeight: "700",
    minWidth: "30px",
  },
  buttonGroup: {
    display: "inline-block",
    fontSize: "0px",
    position: "relative",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
    width: "300px",
  },
  disabledDangerButton: {
    backgroundColor: "#bd362f",
    backgroundImage: "none",
    borderColor: "rgba(0, 0, 0, 0.1)",
    borderRadius: "4px",
    borderStyle: "solid",
    borderWidth: "1px",
    boxShadow: "none",
    color: "#ffffff",
    cursor: "default",
    display: "inline-block",
    fontSize: "12px",
    fontWeight: "700",
    lineHeight: "20px",
    marginBottom: "0px",
    opacity: "0.35",
    padding: "4px 12px",
    position: "relative",
    textAlign: "center",
    textShadow: "0 -1px 0 rgba(0, 0, 0, 0.25)",
    verticalAlign: "middle",
    width: "100%",
  },
  textAlignLeft: { textAlign: "left" },
  cautionTitle: {
    verticalAlign: "top",
    width: "100px",
  },
  caution: {
    backgroundColor: "#eeeeee",
    borderRadius: "3px",
    color: "#333333",
    marginBottom: "7px",
    marginTop: "0px",
    padding: "5px",
  },
});

const migrationDisabledShellStyleProps = stylex.props(styles.disabledShell);
const comebackClassName = stylex.props(styles.comeback).className;
const comebackDetailClassName = stylex.props(styles.comebackDetail).className;
const titleTextBgClassName = stylex.props(styles.legacyRow, styles.titleTextBg).className;
const boardClassName = stylex.props(styles.board).className;
const headerRowClassName = stylex.props(styles.legacyRow).className;
const headTitleClassName = stylex.props(styles.headTitle).className;
const sourceTitleClassName = stylex.props(styles.sourceTitle).className;
const destinationTitleClassName = stylex.props(styles.destinationTitle).className;
const projectWarnClassName = stylex.props(styles.projectWarn).className;
const arrowClassName = stylex.props(styles.arrow).className;
const arrowIconClassName = stylex.props(styles.arrowIcon).className;
const sourceDestinationClassName = stylex.props(styles.sourceDestination).className;
const paneHeaderClassName = stylex.props(styles.paneHeader).className;
const searchClassName = stylex.props(styles.search).className;
const searchInputClassName = stylex.props(styles.searchInput).className;
const projectListClassName = stylex.props(styles.projectList).className;
const sourceColumnClassName = stylex.props(styles.migrationColumn, styles.migrationSpan4).className;
const destinationColumnClassName = stylex.props(
  styles.migrationColumn,
  styles.migrationSpan4,
  styles.destinationProject,
).className;
const statusColumnClassName = stylex.props(styles.migrationColumn, styles.migrationSpan6).className;
const destinationProjectListClassName = stylex.props(styles.destinationProjectList).className;
const progressClassName = stylex.props(styles.progress).className;
const progressBarClassName = stylex.props(styles.progressBar).className;
const statusTableClassName = stylex.props(styles.statusTable).className;
const statusTableHeaderCellClassName = stylex.props(
  styles.statusTableCell,
  styles.statusTableHeaderCell,
  styles.firstStatusTableHeaderCell,
).className;
const statusTableDataCellClassName = stylex.props(
  styles.statusTableCell,
  styles.statusTableDataCell,
).className;
const leftTitleCellClassName = stylex.props(
  styles.statusTableCell,
  styles.statusTableDataCell,
  styles.leftTitle,
).className;
const buttonGroupClassName = stylex.props(styles.buttonGroup).className;
const disabledDangerButtonClassName = stylex.props(styles.disabledDangerButton).className;
const cautionTitleCellClassName = stylex.props(
  styles.statusTableCell,
  styles.statusTableDataCell,
  styles.leftTitle,
  styles.cautionTitle,
).className;
const cautionCellClassName = stylex.props(
  styles.statusTableCell,
  styles.statusTableDataCell,
  styles.textAlignLeft,
).className;
const cautionClassName = stylex.props(styles.caution).className;
const leftTitleClassName = stylex.props(styles.leftTitle).className;

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
      className={`yobi-migration ${migrationDisabledShellStyleProps.className}`}
      data-stylex-owner="migration-disabled-shell"
      data-stylex-page-owner="migration-page"
    >
      <div className="header-pannel" data-stylex-owner="migration-layout">
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
      <div
        className={`comeback-text pull-right ${comebackClassName}`}
        data-stylex-part="migration-disabled-comeback"
      >
        Yona to Github
        <span className={`midium-font ${comebackDetailClassName}`} />
      </div>
      <div className={`row title-text-bg ${titleTextBgClassName}`}>
        <div id="system-msg" className={`well board ${boardClassName}`}>
          <div className="messages" data-stylex-owner="migration-notice">
            {t("error.forbidden.or.not.allowed")}
          </div>
        </div>
      </div>
      <div className="status">
        <div className={`row ${headerRowClassName}`}>
          <div className={`head-title row-fluid ${headTitleClassName}`}>
            <div className={`source-title span5 ${sourceTitleClassName}`}>
              <div className={`project-name warn ${projectWarnClassName}`}>
                Source 프로젝트를 선택해 주세요
              </div>
            </div>
            <div className={`arrow span1 ${arrowClassName}`}>
              <i className={`yobicon-arrow-right-alt ${arrowIconClassName}`} />
            </div>
            <div className={`destination-title span6 ${destinationTitleClassName}`}>
              <div className={`project-name warn ${projectWarnClassName}`}>
                Destination 프로젝트를 선택해 주세요
              </div>
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
      <div className={`header ${paneHeaderClassName}`}>
        {isSource ? "Source 0 개" : "Destination 0 개"}
      </div>
      <div
        className={isSource ? `search left-border ${searchClassName}` : `search ${searchClassName}`}
      >
        <input
          tabIndex={tabIndex}
          type="text"
          className={`search-query ${searchInputClassName}`}
          name="target-filter"
          placeholder="Search.."
          disabled
        />
      </div>
      {isSource ? (
        <div className={`left-project-list ${projectListClassName}`} />
      ) : (
        <div
          className={`destination-project-list ${projectListClassName} ${destinationProjectListClassName}`}
        />
      )}
    </>
  );
  return isSource ? (
    <div
      className={`source-project span4 ${sourceColumnClassName}`}
      data-stylex-owner="migration-source-column-grid"
    >
      {content}
    </div>
  ) : (
    <div
      className={`destination-project span4 ${destinationColumnClassName}`}
      data-stylex-owner="migration-destination-column-grid"
    >
      {content}
    </div>
  );
}

function MigrationStatusTable() {
  return (
    <>
      <table className={`table ${statusTableClassName}`}>
        <thead>
          <tr>
            <th className={statusTableHeaderCellClassName} colSpan={2}>
              Migration 대상
            </th>
            <th className={statusTableHeaderCellClassName} />
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={`left-title ${leftTitleCellClassName}`}>마일스톤</td>
            <td className={`left-title ${leftTitleCellClassName}`}>0</td>
            <td className={statusTableDataCellClassName}>
              <div className={`btn-group ${buttonGroupClassName}`}>
                <button className={`btn btn-danger ${disabledDangerButtonClassName}`} disabled>
                  마일스톤 옮기기
                </button>
              </div>
            </td>
          </tr>
          <tr>
            <td className={`left-title ${leftTitleCellClassName}`}>이슈</td>
            <td className={`left-title ${leftTitleCellClassName}`}>
              <span>0</span>
            </td>
            <td className={statusTableDataCellClassName}>
              <div className={`btn-group ${buttonGroupClassName}`}>
                <button className={`btn btn-danger ${disabledDangerButtonClassName}`} disabled>
                  이슈 옮기기
                </button>
              </div>
            </td>
          </tr>
          <tr>
            <td className={`left-title ${leftTitleCellClassName}`}>게시글</td>
            <td className={`left-title ${leftTitleCellClassName}`}>
              <span>0</span>
            </td>
            <td className={statusTableDataCellClassName}>
              <div className={`btn-group ${buttonGroupClassName}`}>
                <button className={`btn btn-danger ${disabledDangerButtonClassName}`} disabled>
                  게시글 옮기기
                </button>
              </div>
            </td>
          </tr>
          <tr>
            <td className={`td-title left-title ${cautionTitleCellClassName}`}>주의 사항!!</td>
            <td colSpan={2} className={`text-align-left ${cautionCellClassName}`}>
              <div className={`caution ${cautionClassName}`}>
                작업 시작전에 Yona to Githbub 마이그레이션 가이드를 꼭 읽어주세요.
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div className={`left-title ${leftTitleClassName}`}>기존 이슈 담당자</div>
      <div />
    </>
  );
}

function MigrationSourceDestinationGrid() {
  return (
    <div
      className={`row source-destination ${sourceDestinationClassName}`}
      data-stylex-owner="migration-source-destination-row"
    >
      <MigrationProjectPane side="source" tabIndex={1} />
      <MigrationProjectPane side="destination" tabIndex={2} />
      <div
        className={`span6 status ${statusColumnClassName}`}
        data-stylex-owner="migration-status-column-grid"
      >
        <div className={`progress row ${progressClassName}`}>
          <div
            className={`bar span10 bar-danger ${progressBarClassName}`}
            data-stylex-owner="migration-progress-bar"
          >
            0/0
          </div>
        </div>
        <MigrationStatusTable />
      </div>
    </div>
  );
}
