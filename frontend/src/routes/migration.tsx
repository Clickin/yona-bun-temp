/* oxlint-disable jsx-a11y/tabindex-no-positive -- legacy migration/home.scala.html requires positive tab order on source/destination search inputs. */
import * as stylex from "@stylexjs/stylex";
import { createFileRoute } from "@tanstack/react-router";
import { LegacyI18nProvider, useLegacyMessages } from "../i18n";
import { YoramQueryProvider } from "../query-client";
import { globalColors } from "../theme.stylex";
import { SiteLayoutShell } from "./-home-route-screen";

const styles = stylex.create({
  disabledShell: { "--yoram-stylex-migration-disabled-shell": "stylex" },
  comeback: {
    backgroundColor: globalColors.migrationDisabledComebackSurface,
    color: globalColors.migrationDisabledComebackText,
    fontFamily: globalColors.migrationDisabledComebackFontFamily,
    fontSize: globalColors.migrationDisabledComebackFontSize,
    textAlign: globalColors.migrationDisabledComebackTextAlign,
    marginRight: globalColors.migrationDisabledComebackMarginRight,
    marginTop: globalColors.migrationDisabledComebackMarginTop,
  },
  comebackDetail: { fontSize: globalColors.migrationDisabledComebackDetailFontSize },
  titleTextBg: {
    backgroundColor: globalColors.migrationDisabledTitleSurface,
    borderTopColor: globalColors.migrationDisabledTitleBorderTop,
    borderBottomColor: globalColors.migrationDisabledTitleBorderBottom,
    borderTopStyle: globalColors.migrationDisabledTitleBorderStyle,
    borderBottomStyle: globalColors.migrationDisabledTitleBorderStyle,
    borderTopWidth: globalColors.migrationDisabledTitleBorderWidth,
    borderBottomWidth: globalColors.migrationDisabledTitleBorderWidth,
  },
  board: {
    fontSize: globalColors.migrationDisabledBoardFontSize,
    maxHeight: globalColors.migrationDisabledBoardMaxHeight,
    overflow: globalColors.migrationDisabledBoardOverflow,
    backgroundColor: globalColors.migrationDisabledBoardSurface,
    color: globalColors.migrationDisabledBoardText,
    borderRadius: globalColors.migrationDisabledBoardRadius,
    marginBottom: globalColors.migrationDisabledBoardMarginBottom,
    borderStyle: globalColors.migrationDisabledBoardBorderStyle,
    borderWidth: globalColors.migrationDisabledBoardBorderWidth,
    paddingLeft: globalColors.migrationDisabledBoardPaddingLeft,
  },
  headTitle: {
    backgroundColor: globalColors.migrationDisabledHeadTitleSurface,
    paddingBottom: globalColors.migrationDisabledHeadTitlePaddingBottom,
    wordWrap: globalColors.migrationDisabledHeadTitleWordWrap,
    height: globalColors.migrationDisabledHeadTitleHeight,
  },
  sourceTitle: { textAlign: globalColors.migrationDisabledSourceTitleTextAlign },
  destinationTitle: {
    textAlign: globalColors.migrationDisabledDestinationTitleTextAlign,
    paddingLeft: globalColors.migrationDisabledDestinationTitlePaddingLeft,
  },
  projectWarn: {
    color: globalColors.migrationDisabledProjectWarnText,
    fontSize: globalColors.migrationDisabledProjectWarnFontSize,
    marginTop: globalColors.migrationDisabledProjectWarnMarginTop,
    padding: globalColors.migrationDisabledProjectWarnPadding,
    fontWeight: globalColors.migrationDisabledProjectWarnFontWeight,
    backgroundColor: globalColors.migrationDisabledProjectWarnSurface,
  },
  arrow: {
    textAlign: globalColors.migrationDisabledArrowTextAlign,
    color: globalColors.migrationDisabledArrowText,
  },
  arrowIcon: {
    fontSize: globalColors.migrationDisabledArrowIconFontSize,
    padding: globalColors.migrationDisabledArrowIconPadding,
  },
  selection: { marginLeft: globalColors.migrationDisabledSelectionMarginLeft },
  paneHeader: {
    padding: globalColors.migrationDisabledPaneHeaderPadding,
    backgroundColor: globalColors.migrationDisabledPaneHeaderSurface,
    fontWeight: globalColors.migrationDisabledPaneHeaderFontWeight,
    fontSize: globalColors.migrationDisabledPaneHeaderFontSize,
    color: globalColors.migrationDisabledPaneHeaderText,
  },
  search: {
    borderRightColor: globalColors.migrationDisabledSearchBorderRight,
    borderStyle: globalColors.migrationDisabledSearchBorderStyle,
    borderRightWidth: globalColors.migrationDisabledSearchBorderRightWidth,
    borderBottomWidth: globalColors.migrationDisabledSearchBorderBottomWidth,
    borderTopWidth: globalColors.migrationDisabledSearchBorderTopWidth,
    borderLeftWidth: globalColors.migrationDisabledSearchBorderLeftWidth,
    height: globalColors.migrationDisabledSearchHeight,
  },
  searchInput: {
    borderStyle: globalColors.migrationDisabledSearchInputBorderStyle,
    borderWidth: globalColors.migrationDisabledSearchInputBorderWidth,
    height: globalColors.migrationDisabledSearchInputHeight,
    fontSize: globalColors.migrationDisabledSearchInputFontSize,
  },
  projectList: {
    height: globalColors.migrationDisabledProjectListHeight,
    overflow: globalColors.migrationDisabledProjectListOverflow,
    borderColor: globalColors.migrationDisabledProjectListBorder,
    borderStyle: globalColors.migrationDisabledProjectListBorderStyle,
    borderWidth: globalColors.migrationDisabledProjectListBorderWidth,
  },
  destinationProject: { marginLeft: globalColors.migrationDisabledDestinationProjectMarginLeft },
  destinationProjectList: {
    borderLeftWidth: globalColors.migrationDisabledDestinationProjectListBorderLeftWidth,
  },
});

const disabledShellClassName = stylex.props(styles.disabledShell).className;
const comebackClassName = stylex.props(styles.comeback).className;
const comebackDetailClassName = stylex.props(styles.comebackDetail).className;
const titleTextBgClassName = stylex.props(styles.titleTextBg).className;
const boardClassName = stylex.props(styles.board).className;
const headTitleClassName = stylex.props(styles.headTitle).className;
const sourceTitleClassName = stylex.props(styles.sourceTitle).className;
const destinationTitleClassName = stylex.props(styles.destinationTitle).className;
const projectWarnClassName = stylex.props(styles.projectWarn).className;
const arrowClassName = stylex.props(styles.arrow).className;
const arrowIconClassName = stylex.props(styles.arrowIcon).className;
const selectionClassName = stylex.props(styles.selection).className;
const paneHeaderClassName = stylex.props(styles.paneHeader).className;
const searchClassName = stylex.props(styles.search).className;
const searchInputClassName = stylex.props(styles.searchInput).className;
const projectListClassName = stylex.props(styles.projectList).className;
const destinationProjectClassName = stylex.props(styles.destinationProject).className;
const destinationProjectListClassName = stylex.props(styles.destinationProjectList).className;

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
  const { t } = useLegacyMessages();

  return (
    <div
      className={`yobi-migration ${disabledShellClassName}`}
      data-stylex-owner="migration-disabled-shell"
    >
      <div className="header-pannel">
        <div
          className={`comeback-text pull-right ${comebackClassName}`}
          data-stylex-part="migration-disabled-comeback"
        >
          Yona to Github
          <span className={`midium-font ${comebackDetailClassName}`} />
        </div>
        <div className={`row title-text-bg ${titleTextBgClassName}`}>
          <div id="system-msg" className={`well board ${boardClassName}`}>
            <div className="messages">{t("error.forbidden.or.not.allowed")}</div>
          </div>
        </div>
        <div className="status">
          <div className="row">
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
        <div className={`row source-destination ${selectionClassName}`}>
          <div className="source-project span4">
            <div className={`header ${paneHeaderClassName}`}>Source 0 개</div>
            <div className={`search left-border ${searchClassName}`}>
              <input
                tabIndex={1}
                type="text"
                className={`search-query ${searchInputClassName}`}
                name="target-filter"
                placeholder="Search.."
                disabled
              />
            </div>
            <div className={`left-project-list ${projectListClassName}`} />
          </div>
          <div className={`destination-project span4 ${destinationProjectClassName}`}>
            <div className={`header ${paneHeaderClassName}`}>Destination 0 개</div>
            <div className={`search ${searchClassName}`}>
              <input
                type="text"
                tabIndex={2}
                className={`search-query ${searchInputClassName}`}
                name="target-filter"
                placeholder="Search.."
                disabled
              />
            </div>
            <div
              className={`destination-project-list ${projectListClassName} ${destinationProjectListClassName}`}
            />
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
