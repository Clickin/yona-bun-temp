import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { FormEvent } from "react";
import { readOrganizationSettingsRest, updateOrganizationRest } from "../../../api/org-project";
import { apiQueryKeys } from "../../../api/query-keys";
import type { OrganizationDetail } from "../../../api/types";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../i18n";
import { YonaQueryProvider } from "../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { SiteLayoutShell } from "../../-home-route-screen";

export const Route = createFileRoute("/organizations/$organizationName/settingform")({
  component: OrganizationSettingsRoute,
});

function OrganizationSettingsRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <SiteLayoutShell runtimeConfig={runtimeConfig}>
          <OrganizationSettingsScreen runtimeConfig={runtimeConfig} />
        </SiteLayoutShell>
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function OrganizationSettingsScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { organizationName } = Route.useParams();
  const query = useQuery({
    queryFn: () => readOrganizationSettingsRest(runtimeConfig, organizationName),
    queryKey: [...apiQueryKeys.organization.base(organizationName), "settings"],
  });

  if (!query.data) {
    return null;
  }

  return <OrganizationSettingsBody organization={query.data} runtimeConfig={runtimeConfig} />;
}

function OrganizationSettingsBody({
  organization,
  runtimeConfig,
}: {
  organization: OrganizationDetail;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const organizationName = stringField(organization.organizationName, "organization");
  const organizationId = stringField(organization.id, "");
  const logoUrl =
    stringField(organization.logoUrl, "") || "/assets/images/organization_default_logo.png";
  const updateMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return updateOrganizationRest(runtimeConfig, csrfToken, organizationName, {
        description: String(formData.get("descr") ?? ""),
        organizationName: String(formData.get("name") ?? ""),
      });
    },
    onSuccess(updatedOrganization) {
      const updatedName = stringField(updatedOrganization.organizationName, organizationName);
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.organization.base(organizationName) });
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.organization.base(updatedName) });
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.organization.list() });
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateMutation.mutate(new FormData(event.currentTarget));
  }

  return (
    <>
      <OrganizationHeader
        basePath={runtimeConfig.basePath}
        logoUrl={logoUrl}
        organizationName={organizationName}
      />
      <OrganizationMenu
        basePath={runtimeConfig.basePath}
        organizationName={organizationName}
        viewerCanUpdate={booleanField(organization.viewerCanUpdate)}
      />
      <div className="page-wrap-outer">
        <div className="project-page-wrap">
          <OrganizationSettingMenu
            active="setting"
            basePath={runtimeConfig.basePath}
            organizationName={organizationName}
          />
          <form
            id="saveSetting"
            method="post"
            action={organizationHref(runtimeConfig.basePath, organizationName)}
            encType="multipart/form-data"
            className="nm"
            name="update-org"
            onSubmit={onSubmit}
          >
            <input type="hidden" name="id" value={organizationId} />
            <div className="bubble-wrap gray">
              <div className="box-wrap top clearfix frm-wrap" style={{ paddingTop: 20 }}>
                <div className="setting-box left">
                  <div className="logo-wrap" style={{ backgroundImage: `url('${logoUrl}')` }}></div>
                  <div className="logo-desc">
                    <ul className="unstyled descs">
                      <li>
                        <strong>{t("organization.logo")}</strong>
                      </li>
                      <li>
                        {t("organization.logo.type")}{" "}
                        <span className="point">bmp, jpg, gif, png</span>
                      </li>
                      <li>
                        {t("organization.logo.maxFileSize")} <span className="point">5MB</span>
                      </li>
                      <li>
                        <div className="btn-wrap">
                          <div className="nbtn medium white fake-file-wrap">
                            <i className="yobicon-upload"></i> {t("button.upload")}
                            <input
                              id="logoPath"
                              type="file"
                              className="file"
                              name="logoPath"
                              accept="image/*"
                            />
                          </div>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
                <dl className="setting-box right">
                  <dt>
                    <label htmlFor="project-name">{t("organization.name.placeholder")}</label>
                  </dt>
                  <dd>
                    <input
                      id="project-name"
                      type="text"
                      name="name"
                      maxLength={250}
                      defaultValue={organizationName}
                    />
                    <div className="orange-txt">
                      <span className="msg wrongName" style={{ display: "none" }}></span>
                    </div>
                  </dd>
                  <dt>
                    <label htmlFor="project-desc">
                      {t("organization.description.placeholder")}
                    </label>
                  </dt>
                  <dd>
                    <textarea
                      id="project-desc"
                      name="descr"
                      maxLength={250}
                      className="textarea"
                      defaultValue={stringField(organization.description, "")}
                    ></textarea>
                  </dd>
                </dl>
              </div>
            </div>
            <div className="box-wrap bottom">
              <button id="save" className="ybtn ybtn-success">
                {t("button.save")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

function OrganizationHeader({
  basePath,
  logoUrl,
  organizationName,
}: {
  basePath: string;
  logoUrl: string;
  organizationName: string;
}) {
  return (
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
                <a href={organizationHref(basePath, organizationName)}>{organizationName}</a>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrganizationMenu({
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
                    activeProps: {
                      "aria-current": undefined,
                      className: undefined,
                      "data-status": undefined,
                    },
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

function OrganizationSettingMenu({
  active,
  organizationName,
}: {
  active: "setting";
  basePath: string;
  organizationName: string;
}) {
  const { t } = useLegacyMessages();

  return (
    <ul className="nav nav-tabs">
      <li className={active === "setting" ? "active" : ""}>
        <Link
          {...({
            activeOptions: { exact: true, explicitUndefined: true, includeSearch: true },
            activeProps: {
              "aria-current": undefined,
              className: undefined,
              "data-status": undefined,
            },
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
      <li className="">
        <Link
          {...({
            activeOptions: { exact: true, explicitUndefined: true, includeSearch: true },
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
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  return fallback;
}

function booleanField(value: unknown) {
  return value === true;
}
