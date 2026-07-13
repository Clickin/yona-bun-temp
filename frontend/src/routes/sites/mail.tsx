import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, type ReactNode, useState } from "react";
import { readSessionBootstrap } from "../../auth-workspace-client";
import {
  sendSiteMailRest,
  siteMailOptionsQueryOptions,
  siteUpdateQueryOptions,
  type SiteMailOptionsResponse,
} from "../../api/site-admin";
import { LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YonaQueryProvider } from "../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../runtime-config";
import { SiteLayoutShell } from "../-home-route-screen";

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
const legacyMailSidebarSearch = { __legacySiteSidebarActiveMarker: undefined };

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
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig} showLegacyProjectHeaderLinks>
          <SiteMailScreen
            errorMessageBySearch={search.errorMessage}
            runtimeConfig={runtimeConfig}
            sentBySearch={search.sended}
          />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
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
      <div className="page-wrap-outer">
        <div className="site-setting-wrap">
          <div className="row-fluid">
            <div className="span2">
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
    <ul className="site-setting-nav">
      <li className="">
        <Link {...legacySiteSidebarLinkProps} to="/sites/userList">
          <LegacyMessage messageKey="site.sidebar.userList" />
        </Link>
      </li>
      <li className="">
        <Link {...legacySiteSidebarLinkProps} to="/sites/postList">
          <LegacyMessage messageKey="site.sidebar.postList" />
        </Link>
      </li>
      <li className="">
        <Link {...legacySiteSidebarLinkProps} to="/sites/issueList">
          <LegacyMessage messageKey="site.sidebar.issueList" />
        </Link>
      </li>
      <li className="">
        <Link {...legacySiteSidebarLinkProps} to="/sites/projectList">
          <LegacyMessage messageKey="site.sidebar.projectList" />
        </Link>
      </li>
      <li className="active">
        <Link {...legacySiteSidebarLinkProps} to="/sites/mail">
          <LegacyMessage messageKey="site.sidebar.mailSend" />
        </Link>
      </li>
      <li className="">
        <Link {...legacySiteSidebarLinkProps} to="/sites/massmail">
          <LegacyMessage messageKey="site.sidebar.massMail" />
        </Link>
      </li>
      <li className="">
        <Link {...legacySiteSidebarLinkProps} to="/sites/update">
          <LegacyMessage messageKey="site.sidebar.update" />
          {showUpdateBadge ? <span className="notification-badge">1</span> : null}
        </Link>
      </li>
      <li className="">
        <Link {...legacySiteSidebarLinkProps} to="/sites/diagnostic">
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
      <div className="title_area">
        <h2 className="pull-left">{t("site.sidebar.mailSend")}</h2>
      </div>
      {!response ? <p>{t("common.loading")}</p> : null}
      {response && (errorMessageBySearch || mutation.isError) ? (
        <div className="alert alert-error">
          <p>{t("site.mail.fail")}</p>
          <p>
            {errorMessageBySearch
              ? renderLegacyHtmlMessage(t(errorMessageBySearch))
              : mutationErrorMessage}
          </p>
        </div>
      ) : null}
      {response && sent ? <div className="alert alert-success">{t("site.mail.sended")}</div> : null}
      {response && response.notConfiguredItems.length > 0 ? (
        <div className="alert alert-error">
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
            <button type="submit" className="ybtn ybtn-primary">
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
