import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, type ReactNode } from "react";
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

interface SiteMailSearch {
  errorMessage: string;
  sended: boolean;
}

export const Route = createFileRoute("/sites/mail")({
  component: SiteMailRoute,
  validateSearch: (search: Record<string, unknown>): SiteMailSearch => ({
    errorMessage: typeof search.errorMessage === "string" ? search.errorMessage : "",
    sended: search.sended === true || search.sended === "true",
  }),
});

function SiteMailRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const { errorMessage, sended } = Route.useSearch();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <SiteMailScreen
            errorMessageBySearch={errorMessage}
            runtimeConfig={runtimeConfig}
            sentBySearch={sended}
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
  const mailOptions = siteMailOptionsQueryOptions(runtimeConfig);
  const query = useQuery(mailOptions);
  const updateQuery = useQuery(siteUpdateQueryOptions(runtimeConfig));

  return (
    <>
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

function SiteAdminSidebar({ showUpdateBadge }: { showUpdateBadge: boolean }) {
  return (
    <ul className="site-setting-nav">
      <li className="">
        <Link activeProps={{ className: undefined }} to="/sites/userList">
          <LegacyMessage messageKey="site.sidebar.userList" />
        </Link>
      </li>
      <li className="">
        <Link activeProps={{ className: undefined }} to="/sites/postList">
          <LegacyMessage messageKey="site.sidebar.postList" />
        </Link>
      </li>
      <li className="">
        <Link activeProps={{ className: undefined }} to="/sites/issueList">
          <LegacyMessage messageKey="site.sidebar.issueList" />
        </Link>
      </li>
      <li className="">
        <Link activeProps={{ className: undefined }} to="/sites/projectList">
          <LegacyMessage messageKey="site.sidebar.projectList" />
        </Link>
      </li>
      <li className="active">
        <Link activeProps={{ className: undefined }} to="/sites/mail">
          <LegacyMessage messageKey="site.sidebar.mailSend" />
        </Link>
      </li>
      <li className="">
        <Link activeProps={{ className: undefined }} to="/sites/massmail">
          <LegacyMessage messageKey="site.sidebar.massMail" />
        </Link>
      </li>
      <li className="">
        <Link activeProps={{ className: undefined }} to="/sites/update">
          <LegacyMessage messageKey="site.sidebar.update" />
          {showUpdateBadge ? <span className="notification-badge">1</span> : null}
        </Link>
      </li>
      <li className="">
        <Link activeProps={{ className: undefined }} to="/sites/diagnostic">
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
  const mutation = useMutation({
    mutationFn: async (input: { body: string; from: string; subject: string; to: string }) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return sendSiteMailRest(runtimeConfig, csrfToken, input);
    },
    onSuccess: (data) => queryClient.setQueryData(mailOptions.queryKey, data),
  });

  if (!response) {
    return null;
  }

  const sent = sentBySearch || response.sent || mutation.data?.sent === true;
  const mutationErrorMessage = mutation.error instanceof Error ? mutation.error.message : "";

  return (
    <>
      <div className="title_area">
        <h2 className="pull-left">{t("site.sidebar.mailSend")}</h2>
      </div>
      {errorMessageBySearch || mutation.isError ? (
        <div className="alert alert-error">
          <p>{t("site.mail.fail")}</p>
          <p>
            {errorMessageBySearch
              ? renderLegacyHtmlMessage(t(errorMessageBySearch))
              : mutationErrorMessage}
          </p>
        </div>
      ) : null}
      {sent ? <div className="alert alert-success">{t("site.mail.sended")}</div> : null}
      {response.notConfiguredItems.length > 0 ? (
        <div className="alert alert-error">
          <p>{t("site.mail.notConfigured", { args: ["/admin/mailconf"] })}</p>
          <ul>
            {response.notConfiguredItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <form
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
    </>
  );
}

function LegacyMessage({ messageKey }: { messageKey: string }) {
  const { t } = useLegacyMessages();
  return <>{t(messageKey)}</>;
}

function renderLegacyHtmlMessage(message: string) {
  const nodes: ReactNode[] = [];
  const tokenPattern = new RegExp(
    String.raw`<br\s*\/?>|<` + String.raw`a\s+href="([^"]+)"\s+target="_blank">([^<>]+)<\/a>`,
    "gi",
  );
  let offset = 0;

  for (const match of message.matchAll(tokenPattern)) {
    if (match.index === undefined) {
      continue;
    }

    if (match.index > offset) {
      nodes.push(<Fragment key={offset}>{message.slice(offset, match.index)}</Fragment>);
    }

    const [rawToken, href, label] = match;
    if (/^<br\s*\/?>$/i.test(rawToken)) {
      nodes.push(<br key={match.index} />);
    } else if (href === "http://www.google.com/chrome/") {
      nodes.push(
        <Link href={href} key={match.index} reloadDocument target="_blank" to={href}>
          {label}
        </Link>,
      );
    } else {
      nodes.push(<Fragment key={match.index}>{rawToken}</Fragment>);
    }

    offset = match.index + rawToken.length;
  }

  if (offset < message.length) {
    nodes.push(<Fragment key={offset}>{message.slice(offset)}</Fragment>);
  }

  return nodes;
}
