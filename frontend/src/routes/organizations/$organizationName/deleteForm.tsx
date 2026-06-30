import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { deleteOrganizationRest, organizationDetailQueryOptions } from "../../../api/org-project";
import { apiQueryKeys } from "../../../api/query-keys";
import type { OrganizationDetail } from "../../../api/types";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";

export const Route = createFileRoute("/organizations/$organizationName/deleteForm")({
  component: OrganizationDeleteFormRoute,
});

function OrganizationDeleteFormRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <OrganizationDeleteFormScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function OrganizationDeleteFormScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { organizationName } = Route.useParams();
  const query = useQuery(organizationDetailQueryOptions(runtimeConfig, organizationName));

  if (!query.data) {
    return null;
  }

  return <OrganizationDeleteFormBody organization={query.data} runtimeConfig={runtimeConfig} />;
}

function OrganizationDeleteFormBody({
  organization,
  runtimeConfig,
}: {
  organization: OrganizationDetail;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const router = useRouter();
  const queryClient = useQueryClient();
  const organizationName = stringField(organization.organizationName, "organization");
  const logoUrl =
    stringField(organization.logoUrl, "") || "/assets/images/organization_default_logo.png";
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return deleteOrganizationRest(runtimeConfig, csrfToken, organizationName);
    },
    onSuccess(response) {
      queryClient.removeQueries({ queryKey: apiQueryKeys.organization.base(organizationName) });
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.organization.list() });
      router.history.push(stringField(response.redirectPath, "/"));
    },
  });

  return (
    <>
      <div className="project-header-outer" style={{ backgroundImage: `url('${logoUrl}')` }}>
        <div className="project-header-inner">
          <div className="project-header-wrap">
            <div className="project-header-avatar">
              <img src={logoUrl} alt="" />
            </div>
            <div className="project-breadcrumb-wrap">
              <div className="project-breadcrumb">
                <span className="project-author">
                  <span className="group-title-head">group</span>
                  <a href={organizationHref(runtimeConfig.basePath, organizationName)}>
                    {organizationName}
                  </a>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <OrganizationMenu
        basePath={runtimeConfig.basePath}
        organizationName={organizationName}
        viewerCanUpdate={booleanField(organization.viewerCanUpdate)}
      />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <OrganizationSettingMenu
            basePath={runtimeConfig.basePath}
            organizationName={organizationName}
          />
          <div className="box-wrap bottom">
            <a
              id="btnDelete"
              href="#alertDeletion"
              className="ybtn ybtn-danger"
              data-toggle="modal"
            >
              {t("organization.delete.this")}
            </a>
          </div>

          <div id="alertDeletion" className="modal hide">
            <div className="modal-header">
              <button type="button" className="close" data-dismiss="modal">
                ×
              </button>
              <h3>{t("organization.delete.requestion")}</h3>
            </div>
            <div className="modal-body">
              <p> {t("organization.delete.reaccept")} </p>
            </div>
            <div className="modal-footer">
              <button
                id="btnDeleteExec"
                type="button"
                className="ybtn ybtn-danger"
                onClick={() => deleteMutation.mutate()}
              >
                {t("button.yes")}
              </button>
              <button type="button" className="ybtn" data-dismiss="modal">
                {t("button.no")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function OrganizationMenu({
  basePath,
  organizationName,
  viewerCanUpdate,
}: {
  basePath: string;
  organizationName: string;
  viewerCanUpdate: boolean;
}) {
  const { t } = useLegacyMessages();

  return (
    <div className="project-menu-outer">
      <div className="project-menu-inner">
        <ul className="project-menu-nav project-menu-gruop">
          <li className="">
            <a href={organizationHref(basePath, organizationName)}>{t("title.organizationHome")}</a>
          </li>
          <li className="">
            <a href={prefixBasePath(basePath, `/organizations/${organizationName}/issues`)}>
              {t("menu.issue")}
            </a>
          </li>
          <li className="">
            <a href={prefixBasePath(basePath, `/organizations/${organizationName}/boards`)}>
              {t("menu.board")}
            </a>
          </li>
          <li className="">
            <a href={prefixBasePath(basePath, `/organizations/${organizationName}/pullrequests`)}>
              {t("menu.pullRequest")}
            </a>
          </li>
        </ul>
        <div className="project-setting">
          <ul className="project-menu-nav">
            {viewerCanUpdate ? (
              <li className="">
                <a
                  href={prefixBasePath(basePath, `/organizations/${organizationName}/settingform`)}
                >
                  <i className="yobicon-cog"></i>
                  <span className="blind">{t("menu.admin")}</span>
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}

function OrganizationSettingMenu({
  basePath,
  organizationName,
}: {
  basePath: string;
  organizationName: string;
}) {
  const { t } = useLegacyMessages();

  return (
    <ul className="nav nav-tabs">
      <li className="">
        <a href={prefixBasePath(basePath, `/organizations/${organizationName}/settingform`)}>
          {t("organization.settingFrom")}
        </a>
      </li>
      <li className="">
        <a href={prefixBasePath(basePath, `/organizations/${organizationName}/members`)}>
          {t("organization.member")}
        </a>
      </li>
      <li className="active">
        <a href={prefixBasePath(basePath, `/organizations/${organizationName}/deleteForm`)}>
          {t("organization.delete")}
        </a>
      </li>
    </ul>
  );
}

function organizationHref(basePath: string, organizationName: string) {
  return prefixBasePath(basePath, `/organizations/${organizationName}`);
}

function stringField(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function booleanField(value: unknown) {
  return value === true;
}
