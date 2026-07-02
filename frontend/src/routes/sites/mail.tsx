import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { AnchorHTMLAttributes, ComponentType } from "react";
import { readSessionBootstrap } from "../../auth-workspace-client";
import {
  sendSiteMailRest,
  siteMailOptionsQueryOptions,
  type SiteMailOptionsResponse,
} from "../../api/site-admin";
import { LegacyI18nProvider, useLegacyMessages } from "../../i18n";
import { YonaQueryProvider } from "../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../runtime-config";
import { SiteLayoutShell } from "../-home-route-screen";

interface SiteMailSearch {
  sended: boolean;
}

const LegacyInternalLink = Link as ComponentType<
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    activeProps?: { className?: string | undefined };
    to: string;
  }
>;

export const Route = createFileRoute("/sites/mail")({
  component: SiteMailRoute,
  validateSearch: (search: Record<string, unknown>): SiteMailSearch => ({
    sended: search.sended === true || search.sended === "true",
  }),
});

function SiteMailRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const { sended } = Route.useSearch();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <SiteMailScreen runtimeConfig={runtimeConfig} sentBySearch={sended} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function SiteMailScreen({
  runtimeConfig,
  sentBySearch,
}: {
  runtimeConfig: RuntimeConfig;
  sentBySearch: boolean;
}) {
  const mailOptions = siteMailOptionsQueryOptions(runtimeConfig);
  const query = useQuery(mailOptions);

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
              <SiteAdminSidebar />
            </div>
            <div className="span10">
              <MailBody
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

function SiteAdminSidebar() {
  const navItems = [
    { href: "/sites/userList", labelKey: "site.sidebar.userList" },
    { href: "/sites/postList", labelKey: "site.sidebar.postList" },
    { href: "/sites/issueList", labelKey: "site.sidebar.issueList" },
    { href: "/sites/projectList", labelKey: "site.sidebar.projectList" },
    { href: "/sites/mail", labelKey: "site.sidebar.mailSend", active: true },
    { href: "/sites/massmail", labelKey: "site.sidebar.massMail" },
    { href: "/sites/update", labelKey: "site.sidebar.update" },
    { href: "/sites/diagnostic", labelKey: "site.sidebar.diagnostics" },
  ];

  return (
    <ul className="site-setting-nav">
      {navItems.map((item) => (
        <li className={item.active ? "active" : ""} key={item.href}>
          <LegacyInternalLink activeProps={{ className: undefined }} to={item.href}>
            <LegacyMessage messageKey={item.labelKey} />
          </LegacyInternalLink>
        </li>
      ))}
    </ul>
  );
}

function MailBody({
  response,
  runtimeConfig,
  sentBySearch,
}: {
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

  return (
    <>
      <div className="title_area">
        <h2 className="pull-left">{t("site.sidebar.mailSend")}</h2>
      </div>
      {mutation.isError ? (
        <div className="alert alert-error">
          <p>{t("site.mail.fail")}</p>
          <p>{mutation.error instanceof Error ? mutation.error.message : ""}</p>
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
