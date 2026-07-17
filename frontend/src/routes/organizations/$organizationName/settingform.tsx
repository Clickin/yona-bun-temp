import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { uploadTemporaryAttachment } from "../../../api/attachments";
import { readOrganizationSettingsRest, updateOrganizationRest } from "../../../api/org-project";
import { apiQueryKeys } from "../../../api/query-keys";
import { RestApiError } from "../../../api/rest-client";
import type { OrganizationDetail } from "../../../api/types";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { useLegacyMessages } from "../../../i18n";
import { prefixBasePath, type RuntimeConfig } from "../../../runtime-config";
import { organizationSettingColors, organizationSettingStyles } from "./-settingform.stylex";

// Legacy output source: yona-original/app/views/organization/setting.scala.html.

export const Route = createFileRoute("/organizations/$organizationName/settingform")({
  component: OrganizationSettingsRoute,
});

function OrganizationSettingsRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return <OrganizationSettingsScreen runtimeConfig={runtimeConfig} />;
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
  const [logoInputKey, setLogoInputKey] = useState(0);
  const [wrongNameMessage, setWrongNameMessage] = useState("");
  const [serverNameError, setServerNameError] = useState("");
  const organizationName = stringField(organization.organizationName, "organization");
  const organizationId = stringField(organization.id, "");
  const logoUrl = stringField(organization.logoUrl, "") || "/assets/images/group_default.png";
  const styles = stylex.create({
    bubble: { backgroundColor: organizationSettingColors.bubbleSurface },
    field: {
      borderColor: organizationSettingColors.fieldBorder,
      borderStyle: "solid",
      borderWidth: "1px",
    },
    logoPoint: { color: organizationSettingColors.logoPoint },
    save: {
      backgroundColor: {
        default: organizationSettingColors.saveSurface,
        ":hover": organizationSettingColors.saveSurface,
        ":focus": organizationSettingColors.saveSurface,
        ":active": organizationSettingColors.saveSurface,
      },
      borderColor: organizationSettingColors.saveBorder,
      color: organizationSettingColors.saveText,
    },
    warning: { color: organizationSettingColors.warningText },
  });

  const updateMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      const logoFile = selectedLogoFile(formData.get("logoPath"));
      const logoAttachmentId = logoFile
        ? (await uploadTemporaryAttachment(runtimeConfig, csrfToken, logoFile)).id
        : undefined;
      return updateOrganizationRest(runtimeConfig, csrfToken, organizationName, {
        description: String(formData.get("descr") ?? ""),
        logoAttachmentId,
        organizationName: String(formData.get("name") ?? ""),
      });
    },
    onError(error) {
      if (error instanceof RestApiError) {
        setServerNameError(t(error.message));
      }
    },
    onMutate() {
      setServerNameError("");
    },
    onSuccess(updatedOrganization) {
      setLogoInputKey((key) => key + 1);
      const updatedName = stringField(updatedOrganization.organizationName, organizationName);
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.organization.base(organizationName) });
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.organization.base(updatedName) });
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.organization.list() });
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (!isLegacyOrganizationName(String(formData.get("name") ?? ""))) {
      setWrongNameMessage(t("organization.name.alert"));
      setServerNameError("");
      return;
    }
    setWrongNameMessage("");
    updateMutation.mutate(formData);
  }

  function onChangeLogoPath(event: ChangeEvent<HTMLInputElement>) {
    if (!isImageFileInput(event.currentTarget)) {
      window.alert(t("organization.logo.alert"));
      setLogoInputKey((key) => key + 1);
      return;
    }

    const form = event.currentTarget.form;
    if (form) {
      updateMutation.mutate(new FormData(form));
    }
  }

  return (
    <>
      <title>{organizationName}</title>
      <div className="page-wrap-outer" data-stylex-owner="organization-setting-page">
        <div className="project-page-wrap" data-stylex-owner="organization-setting-shell">
          <OrganizationSettingMenu active="setting" organizationName={organizationName} />
          <form
            data-stylex-owner="organization-setting-form"
            id="saveSetting"
            method="post"
            action={organizationSettingHref(runtimeConfig.basePath, organizationName)}
            encType="multipart/form-data"
            className="nm"
            name="update-org"
            onSubmit={onSubmit}
          >
            <input type="hidden" name="id" value={organizationId} />
            <div
              className={`bubble-wrap gray ${stylex.props(styles.bubble).className}`}
              data-stylex-owner="organization-setting-bubble"
            >
              <div
                className={`box-wrap top clearfix frm-wrap ${stylex.props(organizationSettingStyles.topBox).className}`}
                data-stylex-owner="organization-setting-top-box"
              >
                <div className="setting-box left">
                  <div
                    className="logo-wrap"
                    style={{ backgroundImage: `url('${logoUrl}')` }}
                    data-stylex-owner="organization-setting-logo"
                  ></div>
                  <div className="logo-desc">
                    <ul className="unstyled descs">
                      <li>
                        <strong>{t("organization.logo")}</strong>
                      </li>
                      <li>
                        {t("organization.logo.type")}{" "}
                        <span
                          className={`point ${stylex.props(styles.logoPoint).className}`}
                          data-stylex-owner="organization-setting-logo-point"
                        >
                          bmp, jpg, gif, png
                        </span>
                      </li>
                      <li>
                        {t("organization.logo.maxFileSize")} <span className="point">5MB</span>
                      </li>
                      <li>
                        <div className="btn-wrap">
                          <div className="nbtn medium white fake-file-wrap">
                            <i className="yobicon-upload"></i> {t("button.upload")}
                            <input
                              data-stylex-owner="organization-setting-name-input"
                              id="logoPath"
                              key={logoInputKey}
                              type="file"
                              className="file"
                              name="logoPath"
                              accept="image/*"
                              onChange={onChangeLogoPath}
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
                      className={stylex.props(styles.field).className}
                      data-stylex-owner="organization-setting-name-field"
                      id="project-name"
                      type="text"
                      name="name"
                      maxLength={250}
                      defaultValue={organizationName}
                    />
                    <div className="orange-txt">
                      {serverNameError ? (
                        <span
                          className={`warning ${stylex.props(styles.warning).className}`}
                          data-stylex-owner="organization-setting-warning"
                        >
                          {serverNameError}
                        </span>
                      ) : null}
                      <span
                        className="msg wrongName"
                        style={wrongNameMessage ? undefined : { display: "none" }}
                      >
                        {wrongNameMessage}
                      </span>
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
                      className={`textarea ${stylex.props(styles.field).className}`}
                      defaultValue={stringField(organization.description, "")}
                    ></textarea>
                  </dd>
                </dl>
              </div>
            </div>
            <div className="box-wrap bottom">
              <button
                id="save"
                className={`ybtn ybtn-success ${stylex.props(styles.save).className}`}
                data-stylex-owner="organization-setting-save"
              >
                {t("button.save")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

function OrganizationSettingMenu({
  active,
  organizationName,
}: {
  active: "setting";
  organizationName: string;
}) {
  const { t } = useLegacyMessages();

  return (
    <ul className="nav nav-tabs" data-stylex-owner="organization-setting-menu">
      <li className={active === "setting" ? "active" : ""}>
        <Link
          activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
          activeProps={{
            "aria-current": undefined,
            className: undefined,
            "data-status": undefined,
          }}
          to="/organizations/$organizationName/settingform"
          params={{ organizationName }}
        >
          {t("organization.settingFrom")}
        </Link>
      </li>
      <li className="">
        <Link
          activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
          activeProps={{
            "aria-current": undefined,
            className: undefined,
            "data-status": undefined,
          }}
          search={{}}
          to="/organizations/$organizationName/members"
          params={{ organizationName }}
        >
          {t("organization.member")}
        </Link>
      </li>
      <li className="">
        <Link
          activeOptions={{ exact: true, explicitUndefined: true, includeSearch: true }}
          activeProps={{
            "aria-current": undefined,
            className: undefined,
            "data-status": undefined,
          }}
          search={{}}
          to="/organizations/$organizationName/deleteForm"
          params={{ organizationName }}
        >
          {t("organization.delete")}
        </Link>
      </li>
    </ul>
  );
}

function organizationSettingHref(basePath: string, organizationName: string) {
  return prefixBasePath(basePath, `/organizations/${organizationName}/setting`);
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

function selectedLogoFile(value: FormDataEntryValue | null) {
  if (!(value instanceof File) || !value.name || value.size === 0) {
    return null;
  }
  return value;
}

function isImageFileInput(input: HTMLInputElement) {
  const files = Array.from(input.files ?? []);
  if (files.length > 0) {
    return files.every((file) => isImageFile(file, file.name));
  }
  return /\.(gif|bmp|jpg|jpeg|png)$/i.test(input.value);
}

function isImageFile(file: File, fallbackName: string) {
  if (file.type) {
    return file.type.toLowerCase().startsWith("image/");
  }
  return /\.(gif|bmp|jpg|jpeg|png)$/i.test(fallbackName);
}

function isLegacyOrganizationName(value: string) {
  return /^[a-zA-Z0-9-가-힣]+([_.][a-zA-Z0-9-가-힣]+)*$/u.test(value);
}
