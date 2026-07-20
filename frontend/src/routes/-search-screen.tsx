import * as stylex from "@stylexjs/stylex";
import { Link } from "@tanstack/react-router";
import legacySpriteUrl from "../assets/legacy/sprite.png";
import { type SearchResponse, type SearchType } from "../api/search";
import { RestApiError } from "../api/rest-client";
import { useLegacyMessages } from "../i18n";
import { type RuntimeConfig } from "../runtime-config";
import { styles } from "./-search-screen.stylex";

const legacySearchPaginationLinkActiveOptions = {
  exact: true,
  explicitUndefined: true,
  includeSearch: true,
} as const;
const legacySearchPaginationLinkActiveProps = {
  "aria-current": undefined,
  className: undefined,
  "data-status": undefined,
} as const;

export function isRequestTextTooLargeError(error: unknown) {
  return error instanceof RestApiError && error.status === 413;
}

export function isDefaultForbiddenError(error: unknown) {
  return error instanceof RestApiError && error.status === 403;
}

export function isDefaultInternalServerError(error: unknown) {
  return error instanceof RestApiError && error.status >= 500;
}

export function DefaultSearchErrorBody({
  iconClassName,
  messageKey,
  ybtnClassName = "ybtn ybtn-primary",
}: {
  iconClassName: string;
  messageKey: string;
  runtimeConfig: RuntimeConfig;
  ybtnClassName?: string;
}) {
  const { t } = useLegacyMessages();
  const errorWrap = stylex.props(styles.errorWrap);
  const errorIcon = stylex.props(styles.errorIcon(legacySpriteUrl, iconClassName));
  const errorMessage = stylex.props(styles.errorMessage);

  return (
    <div className="page-wrap-outer" data-stylex-owner="search-error-page">
      <div className="project-page-wrap">
        <div
          {...errorWrap}
          className={`${errorWrap.className} error-wrap`}
          data-stylex-owner="search-error-wrap"
        >
          <i
            {...errorIcon}
            className={`${errorIcon.className} ${iconClassName}`}
            data-stylex-owner="search-error-icon"
          ></i>
          <p {...errorMessage} data-stylex-owner="search-error-message">
            {t(messageKey)}
          </p>
          <Link
            activeOptions={legacySearchPaginationLinkActiveOptions}
            activeProps={legacySearchPaginationLinkActiveProps}
            className={ybtnClassName}
            to="/"
            data-stylex-owner="search-error-home"
          >
            {t("menu.home")}
          </Link>
        </div>
      </div>
    </div>
  );
}

export function RequestTextTooLargeErrorBody() {
  const { t } = useLegacyMessages();
  const errorWrap = stylex.props(styles.errorWrap);
  const errorIcon = stylex.props(styles.errorIcon(legacySpriteUrl, "ico ico-err2"));
  const errorMessage = stylex.props(styles.errorMessage);

  return (
    <div className="page-wrap-outer" data-stylex-owner="search-error-page">
      <div className="project-page-wrap">
        <div
          {...errorWrap}
          className={`${errorWrap.className} error-wrap`}
          data-stylex-owner="search-error-wrap"
        >
          <i
            {...errorIcon}
            className={`${errorIcon.className} ico ico-err2`}
            data-stylex-owner="search-error-icon"
          ></i>
          <p {...errorMessage} data-stylex-owner="search-error-message">
            {t("error.tooLargeText.title")}
          </p>
          <p {...errorMessage} data-stylex-owner="search-error-limit">
            {t("error.tooLargeText.limit", { args: [102400] })}
          </p>
        </div>
      </div>
    </div>
  );
}

export function emptySearchResult(input: {
  keyword: string;
  pageNum: number;
  scope: SearchResponse["scope"];
  searchType: SearchType;
}): SearchResponse {
  return {
    context: {
      organizationName: "",
      ownerName: "",
      projectName: "",
    },
    counts: {
      issueComments: 0,
      issues: 0,
      milestones: 0,
      postComments: 0,
      posts: 0,
      projects: 0,
      reviews: 0,
      users: 0,
    },
    items: [],
    keyword: input.keyword,
    pageNum: input.pageNum,
    pageSize: 20,
    requestedSearchType: input.searchType,
    scope: input.scope,
    searchType: input.searchType === "auto" ? "issue" : input.searchType,
    totalCount: 0,
  };
}
