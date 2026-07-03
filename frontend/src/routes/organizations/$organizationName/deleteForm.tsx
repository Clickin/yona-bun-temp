import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
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
  const [deletionModalOpen, setDeletionModalOpen] = useState(false);
  const openDeletionModal = () => setDeletionModalOpen(true);
  const closeDeletionModal = () => setDeletionModalOpen(false);
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return deleteOrganizationRest(runtimeConfig, csrfToken, organizationName);
    },
    onSuccess(response) {
      queryClient.removeQueries({ queryKey: apiQueryKeys.organization.base(organizationName) });
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.organization.list() });
      router.history.push(
        prefixBasePath(runtimeConfig.basePath, stringField(response.redirectPath, "/")),
      );
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
        organizationName={organizationName}
        viewerCanUpdate={booleanField(organization.viewerCanUpdate)}
      />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <OrganizationSettingMenu organizationName={organizationName} />
          <div className="box-wrap bottom">
            <button
              id="btnDelete"
              type="button"
              className="ybtn ybtn-danger"
              onClick={openDeletionModal}
            >
              {t("organization.delete.this")}
            </button>
          </div>

          <div
            id="alertDeletion"
            className={`modal hide${deletionModalOpen ? " in" : ""}`}
            style={deletionModalOpen ? { display: "block" } : undefined}
          >
            <div className="modal-header">
              <button
                type="button"
                className="close"
                data-dismiss="modal"
                onClick={closeDeletionModal}
              >
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
              <button
                type="button"
                className="ybtn"
                data-dismiss="modal"
                onClick={closeDeletionModal}
              >
                {t("button.no")}
              </button>
            </div>
          </div>
          {deletionModalOpen ? <div className="modal-backdrop fade in"></div> : null}
        </div>
      </div>
    </>
  );
}

function OrganizationMenu({
  organizationName,
  viewerCanUpdate,
}: {
  organizationName: string;
  viewerCanUpdate: boolean;
}) {
  const { t } = useLegacyMessages();

  return (
    <div className="project-menu-outer">
      <div className="project-menu-inner">
        <ul className="project-menu-nav project-menu-gruop">
          <li className="">
            <Link
              {...({
                activeOptions: { exact: true, explicitUndefined: true, includeSearch: true },
                search: {},
                to: `/organizations/${organizationName}`,
              } as unknown as Parameters<typeof Link>[0])}
            >
              {t("title.organizationHome")}
            </Link>
          </li>
          <li className="">
            <Link
              {...({
                activeOptions: { exact: true, explicitUndefined: true, includeSearch: true },
                search: () => undefined,
                to: `/organizations/${organizationName}/issues`,
              } as unknown as Parameters<typeof Link>[0])}
            >
              {t("menu.issue")}
            </Link>
          </li>
          <li className="">
            <Link
              {...({
                activeOptions: { exact: true, explicitUndefined: true, includeSearch: true },
                search: () => undefined,
                to: `/organizations/${organizationName}/boards`,
              } as unknown as Parameters<typeof Link>[0])}
            >
              {t("menu.board")}
            </Link>
          </li>
          <li className="">
            <Link
              {...({
                activeOptions: { exact: true, explicitUndefined: true, includeSearch: true },
                search: () => undefined,
                to: `/organizations/${organizationName}/pullrequests`,
              } as unknown as Parameters<typeof Link>[0])}
            >
              {t("menu.pullRequest")}
            </Link>
          </li>
        </ul>
        <div className="project-setting">
          <ul className="project-menu-nav">
            {viewerCanUpdate ? (
              <li className="">
                <Link
                  {...({
                    activeOptions: { exact: true, explicitUndefined: true, includeSearch: true },
                    search: () => undefined,
                    to: `/organizations/${organizationName}/settingform`,
                  } as unknown as Parameters<typeof Link>[0])}
                >
                  <i className="yobicon-cog"></i>
                  <span className="blind">{t("menu.admin")}</span>
                </Link>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}

function OrganizationSettingMenu({ organizationName }: { organizationName: string }) {
  const { t } = useLegacyMessages();

  return (
    <ul className="nav nav-tabs">
      <li className="">
        <Link
          {...({
            activeOptions: { exact: true, explicitUndefined: true, includeSearch: true },
            search: () => undefined,
            to: `/organizations/${organizationName}/settingform`,
          } as unknown as Parameters<typeof Link>[0])}
        >
          {t("organization.settingFrom")}
        </Link>
      </li>
      <li className="">
        <Link
          {...({
            activeOptions: { exact: true, explicitUndefined: true, includeSearch: true },
            search: {},
            to: `/organizations/${organizationName}/members`,
          } as unknown as Parameters<typeof Link>[0])}
        >
          {t("organization.member")}
        </Link>
      </li>
      <li className="active">
        <Link
          {...({
            activeOptions: { exact: true, explicitUndefined: true, includeSearch: true },
            activeProps: {
              "aria-current": undefined,
              className: undefined,
              "data-status": undefined,
            },
            search: {},
            to: `/organizations/${organizationName}/deleteForm`,
          } as unknown as Parameters<typeof Link>[0])}
        >
          {t("organization.delete")}
        </Link>
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
