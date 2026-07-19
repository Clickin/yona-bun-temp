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
  page: {
    marginTop: "10px",
    minHeight: "450px",
    "@media all and (max-width: 720px)": {
      boxSizing: "border-box",
      minWidth: "10px",
      padding: "0px",
      width: "100%",
    },
  },
  content: { margin: "0px auto" },
  grid: {
    width: "100%",
    "::before": { content: '\"\"', display: "table", lineHeight: "0px" },
    "::after": { clear: "both", content: '\"\"', display: "table", lineHeight: "0px" },
  },
  sidebarColumn: {
    boxSizing: "border-box",
    display: "block",
    float: "left",
    marginLeft: "0px",
    minHeight: "30px",
    width: "14.893617021276595%",
    "@media (min-width: 1200px)": { width: "14.52991452991453%" },
    "@media (min-width: 768px) and (max-width: 979px)": { width: "14.3646408839779%" },
    "@media (max-width: 767px)": { float: "none", width: "100%" },
  },
  contentColumn: {
    boxSizing: "border-box",
    display: "block",
    float: "left",
    marginLeft: "2.127659574468085%",
    minHeight: "30px",
    width: "82.97872340425532%",
    "@media (min-width: 1200px)": {
      marginLeft: "2.564102564102564%",
      width: "82.90598290598291%",
    },
    "@media (min-width: 768px) and (max-width: 979px)": {
      marginLeft: "2.7624309392265194%",
      width: "82.87292817679558%",
    },
    "@media (max-width: 767px)": { float: "none", marginLeft: "0px", width: "100%" },
  },
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
  sendActionWrap: {
    textAlign: "center",
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
  form: { margin: "0px 0px 20px" },
  controlGroup: {
    marginBottom: "20px",
    "::before": { content: '""', display: "table", lineHeight: "0px" },
    "::after": { clear: "both", content: '""', display: "table", lineHeight: "0px" },
  },
  wideControlGroup: { marginRight: "10px" },
  controlLabel: {
    display: "block",
    float: "left",
    paddingTop: "5px",
    textAlign: "right",
    width: "160px",
    "@media (max-width: 480px)": {
      float: "none",
      paddingTop: "0px",
      textAlign: "left",
      width: "auto",
    },
  },
  controls: {
    marginLeft: "180px",
    "@media (max-width: 480px)": { marginLeft: "0px" },
  },
  formField: {
    display: "inline-block",
    marginBottom: "0px",
    verticalAlign: "middle",
    "@media (max-width: 767px)": {
      boxSizing: "border-box",
      display: "block",
      minHeight: "30px",
    },
  },
  shortField: { width: { default: "286px", "@media (max-width: 767px)": "100%" } },
  wideField: { width: { default: "926px", "@media (max-width: 767px)": "100%" } },
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
      <div {...stylex.props(styles.page)} data-stylex-owner="site-mail-page">
        <div {...stylex.props(styles.content)} data-stylex-owner="site-mail-content">
          <div {...stylex.props(styles.grid)} data-stylex-owner="site-mail-setting-grid">
            <div {...stylex.props(styles.sidebarColumn)} data-stylex-owner="site-mail-sidebar-column">
              <SiteAdminSidebar showUpdateBadge={Boolean(updateQuery.data?.versionToUpdate)} />
            </div>
            <div {...stylex.props(styles.contentColumn)} data-stylex-owner="site-mail-setting-content-column">
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
  const formStyleProps = stylex.props(styles.form);
  const controlGroupStyleProps = stylex.props(styles.controlGroup);
  const wideControlGroupStyleProps = stylex.props(styles.controlGroup, styles.wideControlGroup);
  const controlLabelStyleProps = stylex.props(styles.controlLabel);
  const controlsStyleProps = stylex.props(styles.controls);
  const shortFieldStyleProps = stylex.props(styles.formField, styles.shortField);
  const wideFieldStyleProps = stylex.props(styles.formField, styles.wideField);

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
          {...formStyleProps}
          data-stylex-owner="site-mail-form"
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
          <div {...controlGroupStyleProps} data-stylex-owner="site-mail-form-group">
            <label {...{ name: "from" }} {...controlLabelStyleProps} data-stylex-owner="site-mail-form-label">
              {t("site.mail.from")}
            </label>
            <div {...controlsStyleProps} data-stylex-owner="site-mail-form-controls">
              <input
                {...shortFieldStyleProps}
                data-stylex-owner="site-mail-form-field"
                type="text"
                name="from"
                defaultValue={response.sender}
                required
                placeholder={t("site.mail.fromPlaceholder")}
              />
            </div>
          </div>

          <div {...controlGroupStyleProps} data-stylex-owner="site-mail-form-group">
            <label {...{ name: "to" }} {...controlLabelStyleProps} data-stylex-owner="site-mail-form-label">
              {t("site.mail.to")}
            </label>
            <div {...controlsStyleProps} data-stylex-owner="site-mail-form-controls">
              <input
                {...shortFieldStyleProps}
                data-stylex-owner="site-mail-form-field"
                type="text"
                name="to"
                required
                placeholder={t("site.mail.toPlaceholder")}
              />
            </div>
          </div>

          <div {...wideControlGroupStyleProps} data-stylex-owner="site-mail-form-group" data-variant="wide">
            <label {...{ name: "subject" }} {...controlLabelStyleProps} data-stylex-owner="site-mail-form-label">
              {t("site.mail.subject")}
            </label>
            <div {...controlsStyleProps} data-stylex-owner="site-mail-form-controls">
              <input {...wideFieldStyleProps} data-stylex-owner="site-mail-form-field" type="text" name="subject" />
            </div>
          </div>

          <div {...wideControlGroupStyleProps} data-stylex-owner="site-mail-form-group" data-variant="wide">
            <label {...{ name: "body" }} {...controlLabelStyleProps} data-stylex-owner="site-mail-form-label">
              {t("site.mail.body")}
            </label>
            <div {...controlsStyleProps} data-stylex-owner="site-mail-form-controls">
              <textarea
                {...wideFieldStyleProps}
                data-stylex-owner="site-mail-form-field"
                id="body"
                name="body"
                rows={16}
              />
            </div>
          </div>

          <div
            {...stylex.props(styles.sendActionWrap)}
            className={`span12 mail-btn-wrap ${stylex.props(styles.sendActionWrap).className ?? ""}`.trim()}
            data-stylex-owner="site-mail-send-action-wrap"
          >
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
