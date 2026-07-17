import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { Fragment, type ReactNode, useState } from "react";
import { readSessionBootstrap } from "../../auth-workspace-client";
import {
  sendSiteMailRest,
  siteMailOptionsQueryOptions,
  siteUpdateQueryOptions,
  type SiteMailOptionsResponse,
} from "../../api/site-admin";
import { LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YoramQueryProvider } from "../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../runtime-config";
import { SiteLayoutShell } from "../-home-route-screen";
import { siteMailColors } from "./-mail.stylex";

const styles = stylex.create({
  sidebar: {
    margin: "0px",
    padding: "0px",
    listStyle: "none",
  },
  sidebarItem: {
    borderLeftColor: siteMailColors.sidebarBorder,
    borderLeftStyle: "solid",
    borderLeftWidth: "4px",
    fontSize: "14px",
    lineHeight: "30px",
    marginTop: "3px",
  },
  sidebarFirstItem: { marginTop: "0px" },
  sidebarActiveItem: {
    borderLeftColor: siteMailColors.sidebarActiveBorder,
    fontWeight: "bold",
  },
  sidebarLink: {
    backgroundColor: {
      ":hover": siteMailColors.sidebarHoverSurface,
      ":focus": siteMailColors.sidebarHoverSurface,
    },
    color: "inherit",
    display: "block",
    outline: {
      default: "none",
      ":hover": "none",
      ":focus": "none",
    },
    padding: "5px 10px",
    textDecoration: {
      default: "none",
      ":hover": "none",
      ":focus": "none",
    },
  },
  sidebarActiveLink: {
    backgroundColor: {
      ":hover": "transparent",
      ":focus": "transparent",
    },
  },
  sidebarBadge: {
    backgroundColor: siteMailColors.badgeSurface,
    borderColor: siteMailColors.badgeBorder,
    borderRadius: "10px",
    borderStyle: "solid",
    borderWidth: "2px",
    boxShadow: siteMailColors.badgeShadow,
    color: siteMailColors.badgeText,
    fontSize: "12px",
    lineHeight: "20px",
    padding: "0px 5px",
  },
  titleArea: {
    overflow: "hidden",
    marginBottom: "29px",
    paddingBottom: "8px",
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    borderBottomColor: siteMailColors.titleBorder,
  },
  title: {
    margin: "0px",
    fontSize: "1.5em",
    color: siteMailColors.titleText,
    lineHeight: "30px",
  },
  sendAction: {
    backgroundColor: {
      default: siteMailColors.actionSurface,
      ":hover": siteMailColors.actionInteractiveSurface,
      ":focus": siteMailColors.actionInteractiveSurface,
      ":active": siteMailColors.actionInteractiveSurface,
    },
    borderColor: {
      default: siteMailColors.actionBorder,
      ":hover": siteMailColors.actionBorder,
      ":focus": siteMailColors.actionBorder,
      ":active": siteMailColors.actionBorder,
    },
    borderRadius: "3px",
    borderStyle: "solid",
    borderWidth: "1px",
    boxShadow: siteMailColors.actionShadow,
    color: siteMailColors.actionText,
    cursor: "pointer",
    display: "inline-block",
    fontSize: "14px",
    lineHeight: "20px",
    marginBottom: "0px",
    marginLeft: "0.3em",
    outline: "0 none",
    padding: "4px 12px",
    position: "relative",
    textAlign: "center",
    textDecoration: {
      ":hover": "none",
      ":focus": "none",
      ":active": "none",
    },
    textShadow: "none",
    transition: "all 0.3s ease",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
    zIndex: "2",
  },
  successAlert: {
    padding: "8px 35px 8px 14px",
    marginBottom: "20px",
    textShadow: siteMailColors.alertTextShadow,
    backgroundColor: siteMailColors.successSurface,
    borderColor: siteMailColors.successBorder,
    borderStyle: "solid",
    borderWidth: "1px",
    borderRadius: "4px",
    color: siteMailColors.successText,
  },
  errorAlert: {
    padding: "8px 35px 8px 14px",
    marginBottom: "20px",
    textShadow: siteMailColors.alertTextShadow,
    backgroundColor: siteMailColors.errorSurface,
    borderColor: siteMailColors.errorBorder,
    borderStyle: "solid",
    borderWidth: "1px",
    borderRadius: "4px",
    color: siteMailColors.errorText,
  },
  notConfiguredAlert: {
    padding: "8px 35px 8px 14px",
    marginBottom: "20px",
    textShadow: siteMailColors.alertTextShadow,
    backgroundColor: siteMailColors.errorSurface,
    borderColor: siteMailColors.errorBorder,
    borderStyle: "solid",
    borderWidth: "1px",
    borderRadius: "4px",
    color: siteMailColors.errorText,
  },
});

interface SiteMailRouteSearch {
  errorMessage?: string;
  sended?: boolean;
}

interface SiteMailSearch {
  errorMessage: string;
  sended: boolean;
}

const legacySiteSidebarLinkProps = {
  activeOptions: { exact: true, explicitUndefined: true, includeHash: true, includeSearch: true },
  activeProps: { "aria-current": undefined, className: undefined, "data-status": undefined },
};

export const Route = createFileRoute("/sites/mail")({
  component: SiteMailRoute,
  validateSearch: (search: Record<string, unknown>): SiteMailRouteSearch => ({
    errorMessage: typeof search.errorMessage === "string" ? search.errorMessage : undefined,
    sended:
      search.sended === true || search.sended === "true"
        ? true
        : search.sended === false || search.sended === "false"
          ? false
          : undefined,
  }),
});

function SiteMailRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const search = normalizeSiteMailSearch(Route.useSearch());

  return (
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig} showLegacyProjectHeaderLinks>
          <SiteMailScreen
            errorMessageBySearch={search.errorMessage}
            runtimeConfig={runtimeConfig}
            sentBySearch={search.sended}
          />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

function SiteMailScreen({
  errorMessageBySearch,
  runtimeConfig,
  sentBySearch,
}: {
  errorMessageBySearch: string;
  runtimeConfig: RuntimeConfig;
  sentBySearch: boolean;
}) {
  const { t } = useLegacyMessages();
  const mailOptions = siteMailOptionsQueryOptions(runtimeConfig);
  const query = useQuery(mailOptions);
  const updateQuery = useQuery(siteUpdateQueryOptions(runtimeConfig));

  return (
    <>
      <title>{t("title.sendMail")}</title>
      <div className="site-breadcrumb-outer">
        <div className="site-breadcrumb-inner">
          <h3>
            <LegacyMessage messageKey="site.sidebar" />
          </h3>
        </div>
      </div>
      <div className="page-wrap-outer" data-stylex-owner="site-mail-page">
        <div className="site-setting-wrap" data-stylex-owner="site-mail-content">
          <div className="row-fluid">
            <div className="span2" data-stylex-owner="site-mail-sidebar-column">
              <SiteAdminSidebar showUpdateBadge={Boolean(updateQuery.data?.versionToUpdate)} />
            </div>
            <div className="span10">
              <MailBody
                errorMessageBySearch={errorMessageBySearch}
                response={query.data}
                runtimeConfig={runtimeConfig}
                sentBySearch={sentBySearch}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function normalizeSiteMailSearch(search: SiteMailRouteSearch): SiteMailSearch {
  return {
    errorMessage: search.errorMessage ?? "",
    sended: search.sended === true,
  };
}

function SiteAdminSidebar({ showUpdateBadge }: { showUpdateBadge: boolean }) {
  return (
    <ul {...stylex.props(styles.sidebar)} data-stylex-owner="site-mail-sidebar">
      <li
        {...stylex.props(styles.sidebarItem, styles.sidebarFirstItem)}
        data-stylex-owner="site-mail-sidebar-item"
      >
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-mail-sidebar-link"
          to="/sites/userList"
        >
          <LegacyMessage messageKey="site.sidebar.userList" />
        </Link>
      </li>
      <li {...stylex.props(styles.sidebarItem)} data-stylex-owner="site-mail-sidebar-item">
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-mail-sidebar-link"
          to="/sites/postList"
        >
          <LegacyMessage messageKey="site.sidebar.postList" />
        </Link>
      </li>
      <li {...stylex.props(styles.sidebarItem)} data-stylex-owner="site-mail-sidebar-item">
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-mail-sidebar-link"
          to="/sites/issueList"
        >
          <LegacyMessage messageKey="site.sidebar.issueList" />
        </Link>
      </li>
      <li {...stylex.props(styles.sidebarItem)} data-stylex-owner="site-mail-sidebar-item">
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-mail-sidebar-link"
          to="/sites/projectList"
        >
          <LegacyMessage messageKey="site.sidebar.projectList" />
        </Link>
      </li>
      <li
        {...stylex.props(styles.sidebarItem, styles.sidebarActiveItem)}
        data-stylex-owner="site-mail-sidebar-item"
      >
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink, styles.sidebarActiveLink)}
          data-stylex-owner="site-mail-sidebar-link"
          to="/sites/mail"
        >
          <LegacyMessage messageKey="site.sidebar.mailSend" />
        </Link>
      </li>
      <li {...stylex.props(styles.sidebarItem)} data-stylex-owner="site-mail-sidebar-item">
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-mail-sidebar-link"
          to="/sites/massmail"
        >
          <LegacyMessage messageKey="site.sidebar.massMail" />
        </Link>
      </li>
      <li {...stylex.props(styles.sidebarItem)} data-stylex-owner="site-mail-sidebar-item">
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-mail-sidebar-link"
          to="/sites/update"
        >
          <LegacyMessage messageKey="site.sidebar.update" />
          {showUpdateBadge ? (
            <span
              {...stylex.props(styles.sidebarBadge)}
              data-stylex-owner="site-mail-sidebar-badge"
            >
              1
            </span>
          ) : null}
        </Link>
      </li>
      <li {...stylex.props(styles.sidebarItem)} data-stylex-owner="site-mail-sidebar-item">
        <Link
          {...legacySiteSidebarLinkProps}
          {...stylex.props(styles.sidebarLink)}
          data-stylex-owner="site-mail-sidebar-link"
          to="/sites/diagnostic"
        >
          <LegacyMessage messageKey="site.sidebar.diagnostics" />
        </Link>
      </li>
    </ul>
  );
}

function MailBody({
  errorMessageBySearch,
  response,
  runtimeConfig,
  sentBySearch,
}: {
  errorMessageBySearch: string;
  response: SiteMailOptionsResponse | undefined;
  runtimeConfig: RuntimeConfig;
  sentBySearch: boolean;
}) {
  const { t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const mailOptions = siteMailOptionsQueryOptions(runtimeConfig);
  const [formResetKey, setFormResetKey] = useState(0);
  const titleAreaStyleProps = stylex.props(styles.titleArea);
  const titleStyleProps = stylex.props(styles.title);
  const errorAlertStyleProps = stylex.props(styles.errorAlert);
  const successAlertStyleProps = stylex.props(styles.successAlert);
  const notConfiguredAlertStyleProps = stylex.props(styles.notConfiguredAlert);

  const mutation = useMutation({
    mutationFn: async (input: { body: string; from: string; subject: string; to: string }) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return sendSiteMailRest(runtimeConfig, csrfToken, input);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(mailOptions.queryKey, data);
      setFormResetKey((current) => current + 1);
    },
  });

  const sent = sentBySearch || response?.sent === true || mutation.data?.sent === true;
  const mutationErrorMessage = mutation.error instanceof Error ? mutation.error.message : "";

  return (
    <>
      <div
        {...titleAreaStyleProps}
        className={`title_area ${titleAreaStyleProps.className ?? ""}`}
        data-stylex-owner="site-mail-title-strip"
      >
        <h2 {...titleStyleProps} className={`pull-left ${titleStyleProps.className ?? ""}`}>
          {t("site.sidebar.mailSend")}
        </h2>
      </div>
      {!response ? <p>{t("common.loading")}</p> : null}
      {response && (errorMessageBySearch || mutation.isError) ? (
        <div
          {...errorAlertStyleProps}
          className={`alert alert-error ${errorAlertStyleProps.className ?? ""}`}
          data-stylex-owner="site-mail-error-alert"
        >
          <p>{t("site.mail.fail")}</p>
          <p>
            {errorMessageBySearch
              ? renderLegacyHtmlMessage(t(errorMessageBySearch))
              : mutationErrorMessage}
          </p>
        </div>
      ) : null}
      {response && sent ? (
        <div
          {...successAlertStyleProps}
          className={`alert alert-success ${successAlertStyleProps.className ?? ""}`}
          data-stylex-owner="site-mail-success-alert"
        >
          {t("site.mail.sended")}
        </div>
      ) : null}
      {response && response.notConfiguredItems.length > 0 ? (
        <div
          {...notConfiguredAlertStyleProps}
          className={`alert alert-error ${notConfiguredAlertStyleProps.className ?? ""}`}
          data-stylex-owner="site-mail-not-configured-alert"
        >
          <p>{t("site.mail.notConfigured", { args: ["/admin/mailconf"] })}</p>
          <ul>
            {response.notConfiguredItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {response ? (
        <form
          key={`${response.sender}:${formResetKey}`}
          id="mailForm"
          method="post"
          action={prefixBasePath(runtimeConfig.basePath, "/sites/mail")}
          className="form-horizontal"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            mutation.mutate({
              body: String(form.get("body") ?? ""),
              from: String(form.get("from") ?? ""),
              subject: String(form.get("subject") ?? ""),
              to: String(form.get("to") ?? ""),
            });
          }}
        >
          <div className="control-group">
            <label {...{ name: "from" }} className="control-label span3">
              {t("site.mail.from")}
            </label>
            <div className="controls">
              <input
                type="text"
                name="from"
                defaultValue={response.sender}
                required
                placeholder={t("site.mail.fromPlaceholder")}
                className="span4"
              />
            </div>
          </div>

          <div className="control-group">
            <label {...{ name: "to" }} className="control-label">
              {t("site.mail.to")}
            </label>
            <div className="controls">
              <input
                type="text"
                className="span4"
                name="to"
                required
                placeholder={t("site.mail.toPlaceholder")}
              />
            </div>
          </div>

          <div className="control-group mr10">
            <label {...{ name: "subject" }} className="control-label">
              {t("site.mail.subject")}
            </label>
            <div className="controls">
              <input type="text" name="subject" className="span12" />
            </div>
          </div>

          <div className="control-group mr10">
            <label {...{ name: "body" }} className="control-label">
              {t("site.mail.body")}
            </label>
            <div className="controls">
              <textarea id="body" name="body" rows={16} className="span12 input-xlarge textbody" />
            </div>
          </div>

          <div className="span12 mail-btn-wrap">
            <button
              {...stylex.props(styles.sendAction)}
              data-stylex-owner="site-mail-send-action"
              type="submit"
            >
              <strong>{t("site.mail.send")}</strong>
            </button>
          </div>
        </form>
      ) : null}
    </>
  );
}

function LegacyMessage({ messageKey }: { messageKey: string }) {
  const { t } = useLegacyMessages();
  return <>{t(messageKey)}</>;
}

type LegacyHtmlMessagePart =
  | { kind: "text"; value: string }
  | { kind: "break" }
  | { kind: "link"; href: string; target?: string; children: LegacyHtmlMessagePart[] };

function renderLegacyHtmlMessage(message: string) {
  const nodes = renderLegacyHtmlMessageParts(parseLegacyHtmlMessage(message), "legacy-html");

  if (nodes.length === 0) {
    return message;
  }

  return nodes;
}

function parseLegacyHtmlMessage(message: string): LegacyHtmlMessagePart[] {
  const parts: LegacyHtmlMessagePart[] = [];
  const htmlTagPattern = /<br\s*\/?>|<[a]\s+([^>]*?)>([\s\S]*?)<\/[a]>/giu;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = htmlTagPattern.exec(message)) !== null) {
    const start = match.index;
    if (start > lastIndex) {
      parts.push({ kind: "text", value: message.slice(lastIndex, start) });
    }

    if (match[0].toLowerCase().startsWith("<br")) {
      parts.push({ kind: "break" });
    } else {
      const attributes = parseLegacyHtmlAttributes(match[1] ?? "");
      parts.push({
        children: parseLegacyHtmlMessage(match[2] ?? ""),
        href: attributes.href ?? "",
        kind: "link",
        target: attributes.target,
      });
    }

    lastIndex = start + match[0].length;
  }

  if (lastIndex < message.length) {
    parts.push({ kind: "text", value: message.slice(lastIndex) });
  }

  return parts;
}

function parseLegacyHtmlAttributes(source: string) {
  const attributes: Record<string, string> = {};
  const htmlAttributePattern = /([a-zA-Z_:][\w:.-]*)="([^"]*)"/gu;
  let match: RegExpExecArray | null;

  while ((match = htmlAttributePattern.exec(source)) !== null) {
    attributes[match[1]] = match[2];
  }

  return attributes;
}

function renderLegacyHtmlMessageParts(
  parts: LegacyHtmlMessagePart[],
  keyPrefix: string,
): ReactNode[] {
  return parts.flatMap<ReactNode>((part, index): ReactNode[] => {
    const key = `${keyPrefix}-${index}`;

    if (part.kind === "text") {
      return part.value ? [<Fragment key={key}>{part.value}</Fragment>] : [];
    }

    if (part.kind === "break") {
      return [<br key={key} />];
    }

    const children = renderLegacyHtmlMessageParts(part.children, `${key}-child`);
    if (!isRenderableLegacyLinkHref(part.href)) {
      return children;
    }

    if (isInternalLegacyLinkHref(part.href)) {
      return [
        <Link key={key} target={part.target ?? undefined} to={part.href}>
          {children}
        </Link>,
      ];
    }

    return [
      <Link
        href={part.href}
        key={key}
        reloadDocument
        target={part.target ?? undefined}
        to={part.href}
      >
        {children}
      </Link>,
    ];
  });
}

function isInternalLegacyLinkHref(href: string) {
  return href.startsWith("/") || href.startsWith("./") || href.startsWith("../");
}

function isRenderableLegacyLinkHref(href: string) {
  const normalizedHref = href.trim();
  if (
    normalizedHref === "" ||
    normalizedHref === "#" ||
    normalizedHref.startsWith("javascript:") ||
    hasUnresolvedLegacyPlaceholder(normalizedHref)
  ) {
    return false;
  }

  if (isInternalLegacyLinkHref(normalizedHref)) {
    return true;
  }

  try {
    new URL(normalizedHref);
    return true;
  } catch {
    return false;
  }
}

function hasUnresolvedLegacyPlaceholder(value: string) {
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] !== "{") {
      continue;
    }

    let cursor = index + 1;
    while (cursor < value.length && value[cursor] >= "0" && value[cursor] <= "9") {
      cursor += 1;
    }

    if (cursor > index + 1 && value[cursor] === "}") {
      return true;
    }
  }

  return false;
}
