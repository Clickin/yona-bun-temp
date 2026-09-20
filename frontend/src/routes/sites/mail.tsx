import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LegacyMessage } from "../../components/legacy-message";
import { SiteAdminSidebar } from "../../components/site-admin-sidebar";
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
import { YoramQueryProvider } from "../../query-client";
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
      <div data-owner="site-mail-breadcrumb-outer">
        <div data-owner="site-mail-breadcrumb-inner">
          <h3 data-owner="site-mail-breadcrumb-heading">
            <LegacyMessage messageKey="site.sidebar" />
          </h3>
        </div>
      </div>
      <div className="page-wrap-outer" data-owner="site-mail-page">
        <div className="site-setting-wrap" data-owner="site-mail-content">
          <div className="row-fluid" data-owner="site-mail-setting-grid">
            <div className="span2" data-owner="site-mail-sidebar-column">
              <SiteAdminSidebar
                activeTo="/sites/mail"
                badgeOwner="site-mail-sidebar-badge"
                baseLinkProps={legacySiteSidebarLinkProps}
                linkPropsByTo={{
                  // TanStack STATIC_ACTIVE_PROPS overrides activeProps on matched
                  // links; a never-matching marker search keeps the active anchor
                  // free of aria-current/data-status (massmail precedent).
                  "/sites/mail": { search: { __legacySiteSidebarActiveMarker: undefined } },
                }}
                navOwner="site-mail-sidebar"
                ownerPrefix="site-mail-sidebar"
                showUpdateBadge={Boolean(updateQuery.data?.versionToUpdate)}
                styleSlots={{
                  activeItem: [],
                  activeLink: [],
                  badge: [],
                  firstItem: [],
                  item: [],
                  link: [],
                  nav: [],
                }}
                ulClassName="site-setting-nav"
              />
            </div>
            <div className="span10" data-owner="site-mail-setting-content-column">
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
      <div className="title_area" data-owner="site-mail-title-strip">
        <h2 className="pull-left">{t("site.sidebar.mailSend")}</h2>
      </div>
      {!response ? <p>{t("common.loading")}</p> : null}
      {response && (errorMessageBySearch || mutation.isError) ? (
        <div className="alert alert-error" data-owner="site-mail-error-alert">
          <p>{t("site.mail.fail")}</p>
          <p>
            {errorMessageBySearch
              ? renderLegacyHtmlMessage(t(errorMessageBySearch))
              : t(mutationErrorMessage)}
          </p>
        </div>
      ) : null}
      {response && sent ? (
        <div className="alert alert-success" data-owner="site-mail-success-alert">
          {t("site.mail.sended")}
        </div>
      ) : null}
      {response && response.notConfiguredItems.length > 0 ? (
        <div className="alert alert-error" data-owner="site-mail-not-configured-alert">
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
          className="form-horizontal"
          key={`${response.sender}:${formResetKey}`}
          id="mailForm"
          method="post"
          action={prefixBasePath(runtimeConfig.basePath, "/sites/mail")}
          data-owner="site-mail-form"
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
          <div className="control-group" data-owner="site-mail-form-group">
            <label
              className="control-label span3"
              {...({ name: "from" } as unknown as React.LabelHTMLAttributes<HTMLLabelElement>)}
              data-owner="site-mail-form-label"
            >
              {t("site.mail.from")}
            </label>
            <div className="controls" data-owner="site-mail-form-controls">
              <input
                className="span4"
                data-owner="site-mail-form-field"
                type="text"
                name="from"
                defaultValue={response.sender}
                required
                placeholder={t("site.mail.fromPlaceholder")}
              />
            </div>
          </div>

          <div className="control-group" data-owner="site-mail-form-group">
            <label
              className="control-label"
              {...({ name: "to" } as unknown as React.LabelHTMLAttributes<HTMLLabelElement>)}
              data-owner="site-mail-form-label"
            >
              {t("site.mail.to")}
            </label>
            <div className="controls" data-owner="site-mail-form-controls">
              <input
                className="span4"
                data-owner="site-mail-form-field"
                type="text"
                name="to"
                required
                placeholder={t("site.mail.toPlaceholder")}
              />
            </div>
          </div>

          <div className="control-group mr10" data-owner="site-mail-form-group" data-variant="wide">
            <label
              className="control-label"
              {...({ name: "subject" } as unknown as React.LabelHTMLAttributes<HTMLLabelElement>)}
              data-owner="site-mail-form-label"
            >
              {t("site.mail.subject")}
            </label>
            <div className="controls" data-owner="site-mail-form-controls">
              <input
                className="span12"
                data-owner="site-mail-form-field"
                type="text"
                name="subject"
              />
            </div>
          </div>

          <div className="control-group mr10" data-owner="site-mail-form-group" data-variant="wide">
            <label
              className="control-label"
              {...({ name: "body" } as unknown as React.LabelHTMLAttributes<HTMLLabelElement>)}
              data-owner="site-mail-form-label"
            >
              {t("site.mail.body")}
            </label>
            <div className="controls" data-owner="site-mail-form-controls">
              <textarea
                className="span12 input-xlarge textbody"
                data-owner="site-mail-form-field"
                id="body"
                name="body"
                rows={16}
              />
            </div>
          </div>

          <div className="span12 mail-btn-wrap" data-owner="site-mail-send-action-wrap">
            <button className="ybtn ybtn-primary" data-owner="site-mail-send-action" type="submit">
              <strong>{t("site.mail.send")}</strong>
            </button>
          </div>
        </form>
      ) : null}
    </>
  );
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
