import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  copyProjectLabels,
  createProjectLabel,
  deleteProjectLabel,
  deleteProjectLabelCategory,
  listProjectLabelCategories,
  listProjectLabels,
  readProjectContainer,
  updateProjectLabel,
  updateProjectLabelCategory,
} from "../../../../../auth-workspace-client";
import { useAppRuntime } from "../../../../../app-runtime-context";
import { toProjectContainerView } from "../../../../../app-view-models";
import {
  LEGACY_DEFAULT_LANGUAGE,
  lookupLegacyMessage,
  type LegacyI18nContextValue,
} from "../../../../../i18n";
import {
  buildProjectHref,
  ProjectHeader,
  ProjectMenu,
  ProjectSettingsSubMenu,
} from "../../../../-project-views";
import type { ProjectDetailViewModel } from "../../../../-view-models";
import {
  BadRequestPage,
  classifyConnectFailure,
  ForbiddenPage,
  NotFoundPage,
  useDocumentTitle,
} from "../../../../-shared";
import type { RuntimeConfig } from "../../../../../runtime-config";

export const Route = createFileRoute("/$owner/$projectName/issue/labelsform")({
  component: IssueLabelsFormRouteComponent,
});

type LabelView = {
  categoryId: number;
  categoryIsExclusive: boolean;
  categoryName: string;
  color: string;
  id: number;
  name: string;
};

type CategoryView = {
  id: number;
  isExclusive: boolean;
  name: string;
};

type LegacyMessageLookup = LegacyI18nContextValue["t"];
type LegacyMessageArgument = number | string | { key: string };
type LegacyLabelFormMessage = {
  args?: LegacyMessageArgument[];
  detail?: LegacyLabelFormMessage;
  key: string;
};

function legacyMessage(
  messages: LegacyMessageLookup | undefined,
  key: string,
  options: { args?: Array<number | string>; fallback?: string } = {},
) {
  const fallback = options.fallback ?? key;
  return messages
    ? messages(key, { ...options, fallback })
    : lookupLegacyMessage(LEGACY_DEFAULT_LANGUAGE, key, { ...options, fallback });
}

function legacyLabelFormMessage(
  messages: LegacyMessageLookup | undefined,
  message: LegacyLabelFormMessage,
): React.ReactNode {
  const args = message.args?.map((arg) =>
    typeof arg === "object" ? legacyMessage(messages, arg.key) : arg,
  );
  const primary = legacyMessage(messages, message.key, args ? { args } : undefined);
  if (!message.detail) {
    return primary;
  }
  return (
    <>
      {primary}
      <br />
      {legacyLabelFormMessage(messages, message.detail)}
    </>
  );
}

const NEW_LABEL_PRESET_COLORS = [
  "#f44336",
  "#e91e63",
  "#9c27b0",
  "#3f51b5",
  "#2196f3",
  "#03a9f4",
  "#00bcd4",
  "#009688",
  "#4caf50",
  "#8bc34a",
  "#cddc39",
  "#ffeb3b",
  "#ffc107",
  "#ff9800",
  "#ff5722",
  "#795548",
  "#9e9e9e",
];

const EDIT_LABEL_PRESET_COLORS = [
  "#FF7770",
  "#F18CA7",
  "#FFB399",
  "#F1D55C",
  "#A5D870",
  "#32CDA1",
  "#9985D8",
  "#40A0EB",
  "#6BC4E9",
  "#DCBD98",
  "#8C8C9C",
  "#7A9CB4",
];

function IssueLabelsFormRouteComponent() {
  const { owner, projectName } = Route.useParams();
  const { bootstrapping, csrfToken, messages, runtimeConfig } = useAppRuntime();
  const routeHref = `/${owner}/${projectName}/issue/labelsform`;
  const [detail, setDetail] = React.useState<ReturnType<typeof toProjectContainerView> | null>(
    null,
  );
  const [labels, setLabels] = React.useState<LabelView[]>([]);
  const [categories, setCategories] = React.useState<CategoryView[]>([]);
  const [failureKind, setFailureKind] = React.useState<
    null | "bad-request" | "forbidden" | "not-found"
  >(null);

  useDocumentTitle("label");

  const reload = React.useCallback(async () => {
    const [nextDetail, nextLabels, nextCategories] = await Promise.all([
      readProjectContainer(runtimeConfig, owner, projectName),
      listProjectLabels(runtimeConfig, owner, projectName),
      listProjectLabelCategories(runtimeConfig, owner, projectName),
    ]);
    setDetail(toProjectContainerView(nextDetail));
    setLabels(nextLabels.labels.map(toLabelView));
    setCategories(nextCategories.categories.map(toCategoryView));
  }, [owner, projectName, runtimeConfig]);

  React.useEffect(() => {
    let cancelled = false;
    setFailureKind(null);
    void (async () => {
      try {
        await reload();
      } catch (error) {
        if (cancelled) {
          return;
        }
        const nextFailureKind = classifyConnectFailure(error);
        if (nextFailureKind) {
          setFailureKind(nextFailureKind);
          return;
        }
        setFailureKind("bad-request");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  if (bootstrapping) {
    return (
      <main className="app-shell">
        <h1>{messages("common.loading", { fallback: "common.loading" })}</h1>
      </main>
    );
  }
  if (failureKind === "forbidden") {
    return <ForbiddenPage href={routeHref} />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href={routeHref} />;
  }
  if (failureKind === "bad-request") {
    return <BadRequestPage href={routeHref} />;
  }

  return (
    <IssueLabelsFormPage
      categories={categories}
      csrfToken={csrfToken}
      detail={detail}
      labels={labels}
      messages={messages}
      onChanged={reload}
      owner={owner}
      projectName={projectName}
      runtimeConfig={runtimeConfig}
    />
  );
}

function toLabelView(
  label: Awaited<ReturnType<typeof listProjectLabels>>["labels"][number],
): LabelView {
  return {
    categoryId: Number(label.categoryId),
    categoryIsExclusive: label.categoryIsExclusive,
    categoryName: label.categoryName,
    color: label.color,
    id: Number(label.id),
    name: label.name,
  };
}

function toCategoryView(
  category: Awaited<ReturnType<typeof listProjectLabelCategories>>["categories"][number],
): CategoryView {
  return {
    id: Number(category.id),
    isExclusive: category.isExclusive,
    name: category.name,
  };
}

export function IssueLabelsFormPage(props: {
  categories: CategoryView[];
  csrfToken: string;
  detail: ProjectDetailViewModel | null;
  labels: LabelView[];
  messages?: LegacyMessageLookup;
  onChanged: () => Promise<void>;
  owner: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
}) {
  const detail = props.detail ?? {
    enrollmentRequested: false,
    isFavorited: false,
    organizationName: "",
    overview: "",
    ownerName: props.owner,
    projectName: props.projectName,
    projectScope: "public",
    viewerCanEnroll: false,
    viewerCanUpdate: false,
  };
  const grouped = groupLabels(props.labels);
  const [deleteErrorMessage, setDeleteErrorMessage] = React.useState<LegacyLabelFormMessage | null>(
    null,
  );
  return (
    <main className="app-shell">
      <ProjectHeader detail={detail} runtimeConfig={props.runtimeConfig} />
      <ProjectMenu activeMenu="settings" detail={detail} runtimeConfig={props.runtimeConfig} />
      <div className="page-wrap-outer">
        <div className="project-page-wrap label-editor-wrap">
          <ProjectSettingsSubMenu
            active="labels"
            detail={detail}
            messages={props.messages}
            runtimeConfig={props.runtimeConfig}
          />
          <IssueLabelCopyForm {...props} />
          <IssueLabelCreateForm {...props} />
          {deleteErrorMessage ? (
            <div className="alert alert-error" role="alert">
              {legacyLabelFormMessage(props.messages, deleteErrorMessage)}
            </div>
          ) : null}

          <div id="labelsList" className="issue-label-list-wrap">
            {props.labels.length === 0 ? (
              <div className="error-wrap">
                <i className="ico ico-err1" />
                <p>{legacyMessage(props.messages, "label.list.empty")}</p>
              </div>
            ) : (
              <>
                <div className="row-fluid list-head">
                  <div className="span3 category">
                    <strong>{legacyMessage(props.messages, "label.category")}</strong>
                  </div>
                  <div className="span9 name">
                    <strong>{legacyMessage(props.messages, "label.name")}</strong>
                  </div>
                </div>
                {grouped.map((group) => (
                  <div
                    className="row-fluid list-item category-wrap"
                    data-category={group.categoryId}
                    data-category-name={group.categoryName}
                    key={group.categoryId}
                  >
                    <div className="span3">
                      <h5 className="right-txt mr20">
                        <span className="category-name">{group.categoryName}</span>
                        <p className="mt5">
                          <i
                            className={`category-exclusive ${
                              group.categoryIsExclusive
                                ? "yobicon-tag single"
                                : "yobicon-tags multiple"
                            }`}
                            data-html="true"
                            data-toggle="tooltip"
                            title={`${legacyMessage(props.messages, "label.category.option")}<br>${
                              group.categoryIsExclusive
                                ? legacyMessage(props.messages, "label.category.option.single")
                                : legacyMessage(props.messages, "label.category.option.multiple")
                            }`}
                          />
                          <IssueCategoryEditForm category={group} {...props} />
                        </p>
                      </h5>
                    </div>
                    <div className="span9">
                      <table className="table nm">
                        <tbody>
                          {group.labels.map((label) => (
                            <tr data-label-id={label.id} key={label.id}>
                              <td>
                                <span
                                  className="issue-label active"
                                  data-label-id={label.id}
                                  data-label-name={label.name}
                                  style={{ backgroundColor: label.color }}
                                >
                                  {label.name}
                                </span>
                              </td>
                              <td className="actions">
                                <button
                                  className="ybtn ybtn-danger ybtn-small"
                                  data-category-name={group.categoryName}
                                  data-delete-uri={buildProjectHref(
                                    props.runtimeConfig,
                                    props.owner,
                                    props.projectName,
                                    `issue/labels/${label.id}`,
                                  )}
                                  data-label-id={label.id}
                                  onClick={() => {
                                    if (
                                      !window.confirm(
                                        legacyMessage(props.messages, "label.confirm.delete"),
                                      )
                                    ) {
                                      return;
                                    }
                                    setDeleteErrorMessage(null);
                                    void deleteProjectLabel(props.runtimeConfig, props.csrfToken, {
                                      labelId: BigInt(label.id),
                                      ownerName: props.owner,
                                      projectName: props.projectName,
                                    })
                                      .then(props.onChanged)
                                      .catch((error: unknown) =>
                                        setDeleteErrorMessage(
                                          formatLegacyLabelRequestFailure(error, "label.delete"),
                                        ),
                                      );
                                  }}
                                  type="button"
                                >
                                  {legacyMessage(props.messages, "button.delete")}
                                </button>
                                <IssueLabelEditForm label={label} {...props} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
                <link
                  href={buildProjectHref(
                    props.runtimeConfig,
                    props.owner,
                    props.projectName,
                    "issue/labels.css",
                  )}
                  rel="stylesheet"
                  type="text/css"
                />
              </>
            )}
          </div>
        </div>
      </div>

      <IssueLabelEditModal categories={props.categories} messages={props.messages} />
      <IssueCategoryEditModal messages={props.messages} />
    </main>
  );
}

function IssueLabelCopyForm(props: {
  csrfToken: string;
  messages?: LegacyMessageLookup;
  onChanged: () => Promise<void>;
  owner: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
}) {
  const [fromOwnerName, setFromOwnerName] = React.useState("");
  const [fromProjectName, setFromProjectName] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState<LegacyLabelFormMessage | null>(null);
  return (
    <form
      className="new-label-wrap"
      id="copyLabel"
      onSubmit={(event) => {
        event.preventDefault();
        setErrorMessage(null);
        void copyProjectLabels(props.runtimeConfig, props.csrfToken, {
          fromOwnerName,
          fromProjectName,
          ownerName: props.owner,
          projectName: props.projectName,
        })
          .then(props.onChanged)
          .catch((error: unknown) =>
            setErrorMessage(formatLegacyLabelRequestFailure(error, "label.copy")),
          );
      }}
    >
      <strong className="form-legend">{legacyMessage(props.messages, "label.copy.append")}</strong>
      {errorMessage ? (
        <div className="alert alert-error" role="alert">
          {legacyLabelFormMessage(props.messages, errorMessage)}
        </div>
      ) : null}
      <div className="form-wrap">
        <input
          className="input-label mr5"
          name="owner"
          onChange={(event) => setFromOwnerName(event.currentTarget.value)}
          placeholder={legacyMessage(props.messages, "project.owner")}
          type="text"
          value={fromOwnerName}
        />
        <input
          className="input-label"
          name="projectName"
          onChange={(event) => setFromProjectName(event.currentTarget.value)}
          placeholder={legacyMessage(props.messages, "project.name")}
          type="text"
          value={fromProjectName}
        />
      </div>
      <button className="ybtn ybtn-info btn-submit" type="submit">
        {legacyMessage(props.messages, "label.copy")}
      </button>
      <div>{legacyMessage(props.messages, "label.copy.description")}</div>
      <div>{legacyMessage(props.messages, "label.copy.description2")}</div>
    </form>
  );
}

function IssueLabelCreateForm(props: {
  csrfToken: string;
  labels: LabelView[];
  messages?: LegacyMessageLookup;
  onChanged: () => Promise<void>;
  owner: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
}) {
  const [categoryName, setCategoryName] = React.useState("");
  const [labelName, setLabelName] = React.useState("");
  const [labelColor, setLabelColor] = React.useState("#f44336");
  const [errorMessage, setErrorMessage] = React.useState<LegacyLabelFormMessage | null>(null);
  return (
    <form
      className="new-label-wrap"
      id="frmNewLabel"
      onSubmit={(event) => {
        event.preventDefault();
        const requestCategoryName = categoryName.trim();
        const requestLabelName = labelName.trim();
        const requestLabelColor = labelColor.trim();
        if (
          requestCategoryName.length === 0 ||
          requestLabelName.length === 0 ||
          requestLabelColor.length === 0
        ) {
          setErrorMessage({
            args: [{ key: "label.add" }],
            detail: { key: "label.error.empty" },
            key: "label.failedTo",
          });
          return;
        }
        if (!isValidLegacyLabelColor(requestLabelColor)) {
          setErrorMessage({
            args: [{ key: "label.add" }],
            detail: { args: [requestLabelColor], key: "label.error.color" },
            key: "label.failedTo",
          });
          return;
        }
        if (isLabelNameInCategory(props.labels, requestCategoryName, requestLabelName)) {
          setErrorMessage({ key: "label.error.duplicated" });
          return;
        }
        setErrorMessage(null);
        void createProjectLabel(props.runtimeConfig, props.csrfToken, {
          categoryName: requestCategoryName,
          labelColor: requestLabelColor,
          labelName: requestLabelName,
          ownerName: props.owner,
          projectName: props.projectName,
        })
          .then(props.onChanged)
          .catch((error: unknown) =>
            setErrorMessage(formatLegacyLabelRequestFailure(error, "label.add")),
          );
      }}
    >
      <strong className="form-legend">{legacyMessage(props.messages, "label.new")}</strong>
      {errorMessage ? (
        <div className="alert alert-error" role="alert">
          {legacyLabelFormMessage(props.messages, errorMessage)}
        </div>
      ) : null}
      <div className="form-wrap">
        <div>
          <input
            autoComplete="off"
            className="input-label mr5"
            data-provider="typeahead"
            maxLength={250}
            name="category"
            onChange={(event) => setCategoryName(event.currentTarget.value)}
            placeholder={legacyMessage(props.messages, "label.category")}
            type="text"
            value={categoryName}
          />
          <input
            autoComplete="off"
            className="input-label"
            maxLength={250}
            name="name"
            onChange={(event) => setLabelName(event.currentTarget.value)}
            placeholder={legacyMessage(props.messages, "label.name")}
            type="text"
            value={labelName}
          />
        </div>
        <div className="label-preset-colors">
          {NEW_LABEL_PRESET_COLORS.map((color) => (
            <button
              className="issue-label btn-preset-color"
              key={color}
              onClick={() => setLabelColor(color)}
              style={{ backgroundColor: color }}
              type="button"
            />
          ))}
          <input
            className="input-small input-label-color"
            name="color"
            onChange={(event) => setLabelColor(event.currentTarget.value)}
            placeholder={legacyMessage(props.messages, "label.customColor")}
            type="text"
            value={labelColor}
          />
        </div>
      </div>
      <button className="ybtn ybtn-primary btn-submit" type="submit">
        {legacyMessage(props.messages, "label.add")}
      </button>
    </form>
  );
}

function IssueLabelEditForm(props: {
  categories: CategoryView[];
  csrfToken: string;
  label: LabelView;
  labels: LabelView[];
  messages?: LegacyMessageLookup;
  onChanged: () => Promise<void>;
  owner: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
}) {
  const [editing, setEditing] = React.useState(false);
  const [categoryId, setCategoryId] = React.useState(props.label.categoryId);
  const [labelName, setLabelName] = React.useState(props.label.name);
  const [labelColor, setLabelColor] = React.useState(props.label.color);
  const [errorMessage, setErrorMessage] = React.useState<LegacyLabelFormMessage | null>(null);
  if (!editing) {
    return (
      <button
        className="ybtn ybtn-small"
        data-category-id={props.label.categoryId}
        data-label-color={props.label.color}
        data-label-name={props.label.name}
        data-update-uri={buildProjectHref(
          props.runtimeConfig,
          props.owner,
          props.projectName,
          `issue/labels/${props.label.id}`,
        )}
        onClick={() => setEditing(true)}
        type="button"
      >
        {legacyMessage(props.messages, "button.edit")}
      </button>
    );
  }
  return (
    <form
      className="inline-label-edit-form"
      onSubmit={(event) => {
        event.preventDefault();
        const requestLabelName = labelName.trim();
        const requestLabelColor = labelColor.trim();
        const categoryName =
          props.categories.find((category) => category.id === categoryId)?.name ??
          props.label.categoryName;
        const isLabelNameChanged = requestLabelName !== props.label.name;
        if (
          isLabelNameChanged &&
          isLabelNameInCategory(props.labels, categoryName, requestLabelName)
        ) {
          setErrorMessage({
            args: [categoryName],
            key: "label.error.duplicated.in.category",
          });
          return;
        }
        if (!isValidLegacyLabelColor(requestLabelColor)) {
          setErrorMessage({ args: [requestLabelColor], key: "label.error.color" });
          return;
        }
        setErrorMessage(null);
        void updateProjectLabel(props.runtimeConfig, props.csrfToken, {
          categoryId: BigInt(categoryId),
          labelColor: requestLabelColor,
          labelId: BigInt(props.label.id),
          labelName: requestLabelName,
          ownerName: props.owner,
          projectName: props.projectName,
        })
          .then(async () => {
            setEditing(false);
            await props.onChanged();
          })
          .catch((error: unknown) =>
            setErrorMessage(formatLegacyLabelRequestFailure(error, "label.edit")),
          );
      }}
    >
      {errorMessage ? (
        <div className="alert alert-error" role="alert">
          {legacyLabelFormMessage(props.messages, errorMessage)}
        </div>
      ) : null}
      <select
        data-toggle="select2"
        name="category.id"
        onChange={(event) => setCategoryId(Number(event.currentTarget.value))}
        value={categoryId}
      >
        {props.categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <input
        className="text input-label-name"
        maxLength={250}
        name="name"
        onChange={(event) => setLabelName(event.currentTarget.value)}
        placeholder={legacyMessage(props.messages, "label.name")}
        type="text"
        value={labelName}
      />
      <input
        className="input-small input-label-color"
        name="color"
        onChange={(event) => setLabelColor(event.currentTarget.value)}
        placeholder={legacyMessage(props.messages, "label.customColor")}
        type="text"
        value={labelColor}
      />
      <button className="ybtn ybtn-info btnSubmit" type="submit">
        {legacyMessage(props.messages, "button.save")}
      </button>
      <button className="ybtn ybtn-default" onClick={() => setEditing(false)} type="button">
        {legacyMessage(props.messages, "button.cancel")}
      </button>
    </form>
  );
}

function IssueCategoryEditForm(props: {
  category: LabelGroup;
  csrfToken: string;
  messages?: LegacyMessageLookup;
  onChanged: () => Promise<void>;
  owner: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
}) {
  const [editing, setEditing] = React.useState(false);
  const [categoryName, setCategoryName] = React.useState(props.category.categoryName);
  const [isExclusive, setIsExclusive] = React.useState(props.category.categoryIsExclusive);
  const [errorMessage, setErrorMessage] = React.useState<LegacyLabelFormMessage | null>(null);
  if (!editing) {
    return (
      <button
        className="ybtn ybtn-mini"
        data-category-id={props.category.categoryId}
        data-category-is-exclusive={props.category.categoryIsExclusive}
        data-category-name={props.category.categoryName}
        data-category-update-uri={buildProjectHref(
          props.runtimeConfig,
          props.owner,
          props.projectName,
          `issue/labelCategories/${props.category.categoryId}`,
        )}
        onClick={() => setEditing(true)}
        type="button"
      >
        {legacyMessage(props.messages, "label.category.edit")}
      </button>
    );
  }
  return (
    <form
      className="inline-category-edit-form"
      onSubmit={(event) => {
        event.preventDefault();
        setErrorMessage(null);
        void updateProjectLabelCategory(props.runtimeConfig, props.csrfToken, {
          categoryId: BigInt(props.category.categoryId),
          categoryIsExclusive: isExclusive,
          categoryName: categoryName.trim(),
          ownerName: props.owner,
          projectName: props.projectName,
        })
          .then(async () => {
            setEditing(false);
            await props.onChanged();
          })
          .catch((error: unknown) =>
            setErrorMessage(formatLegacyLabelRequestFailure(error, "label.category.edit")),
          );
      }}
    >
      {errorMessage ? (
        <div className="alert alert-error" role="alert">
          {legacyLabelFormMessage(props.messages, errorMessage)}
        </div>
      ) : null}
      <input
        className="text category-name"
        name="name"
        onChange={(event) => setCategoryName(event.currentTarget.value)}
        placeholder={legacyMessage(props.messages, "label.category")}
        type="text"
        value={categoryName}
      />
      <select
        data-dropdown-css-class="select2-without-searchbox"
        data-toggle="select2"
        name="isExclusive"
        onChange={(event) => setIsExclusive(event.currentTarget.value === "true")}
        value={String(isExclusive)}
      >
        <option value="false">
          {legacyMessage(props.messages, "label.category.option.multiple")}
        </option>
        <option value="true">
          {legacyMessage(props.messages, "label.category.option.single")}
        </option>
      </select>
      <button className="ybtn ybtn-info btnSubmit" type="submit">
        {legacyMessage(props.messages, "button.save")}
      </button>
      <button className="ybtn ybtn-default" onClick={() => setEditing(false)} type="button">
        {legacyMessage(props.messages, "button.cancel")}
      </button>
      <button
        className="ybtn ybtn-danger"
        onClick={() => {
          setErrorMessage(null);
          void deleteProjectLabelCategory(props.runtimeConfig, props.csrfToken, {
            categoryId: BigInt(props.category.categoryId),
            ownerName: props.owner,
            projectName: props.projectName,
          })
            .then(props.onChanged)
            .catch((error: unknown) =>
              setErrorMessage(formatLegacyLabelRequestFailure(error, "label.category.delete")),
            );
        }}
        type="button"
      >
        {legacyMessage(props.messages, "button.delete")}
      </button>
    </form>
  );
}

function IssueLabelEditModal(props: {
  categories: CategoryView[];
  messages?: LegacyMessageLookup;
}) {
  return (
    <div
      aria-hidden="true"
      className="modal hide yobiDialog"
      id="editLabel"
      role="dialog"
      tabIndex={-1}
    >
      <div className="btn-dismiss">
        <button className="btn-transparent" data-dismiss="modal" type="button">
          &times;
        </button>
      </div>
      <div className="message edit-label-form">
        <div className="center-txt">
          <select data-toggle="select2" name="category.id">
            {props.categories.flatMap((category) =>
              category.name.length > 0
                ? [
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>,
                  ]
                : [],
            )}
          </select>
          <input
            className="text input-label-name"
            maxLength={250}
            name="name"
            placeholder={legacyMessage(props.messages, "label.name")}
            type="text"
          />
          <div className="label-preset-colors edit">
            {EDIT_LABEL_PRESET_COLORS.map((color) => (
              <button
                className="issue-label btn-preset-color"
                key={color}
                style={{ backgroundColor: color }}
                type="button"
              />
            ))}
            <input
              className="input-small input-label-color"
              name="color"
              placeholder={legacyMessage(props.messages, "label.customColor")}
              type="text"
            />
          </div>
        </div>
        <div className="center-txt buttons mt20 mb20">
          <button className="ybtn ybtn-info btnSubmit" type="button">
            {legacyMessage(props.messages, "button.save")}
          </button>
          <button className="ybtn ybtn-default" data-dismiss="modal" type="button">
            {legacyMessage(props.messages, "button.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

function IssueCategoryEditModal(props: { messages?: LegacyMessageLookup }) {
  return (
    <div
      aria-hidden="true"
      className="modal hide yobiDialog"
      id="editCategory"
      role="dialog"
      tabIndex={-1}
    >
      <div className="btn-dismiss">
        <button className="btn-transparent" data-dismiss="modal" type="button">
          &times;
        </button>
      </div>
      <div className="message edit-label-category-form">
        <div className="center-txt">
          <input
            className="text category-name"
            name="name"
            placeholder={legacyMessage(props.messages, "label.category")}
            type="text"
          />
          <div className="desc">
            {legacyMessage(props.messages, "label.category.option")}
            <select
              data-dropdown-css-class="select2-without-searchbox"
              data-toggle="select2"
              name="isExclusive"
            >
              <option value="false">
                {legacyMessage(props.messages, "label.category.option.multiple")}
              </option>
              <option value="true">
                {legacyMessage(props.messages, "label.category.option.single")}
              </option>
            </select>
          </div>
        </div>
        <div className="center-txt buttons mt20 mb20">
          <button className="ybtn ybtn-info btnSubmit" type="button">
            {legacyMessage(props.messages, "button.save")}
          </button>
          <button className="ybtn ybtn-default" data-dismiss="modal" type="button">
            {legacyMessage(props.messages, "button.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

type LabelGroup = {
  categoryId: number;
  categoryIsExclusive: boolean;
  categoryName: string;
  labels: LabelView[];
};

function groupLabels(labels: LabelView[]): LabelGroup[] {
  const groups = new Map<number, LabelGroup>();
  for (const label of labels) {
    const existing = groups.get(label.categoryId) ?? {
      categoryId: label.categoryId,
      categoryIsExclusive: label.categoryIsExclusive,
      categoryName: label.categoryName,
      labels: [],
    };
    existing.labels.push(label);
    groups.set(label.categoryId, existing);
  }
  return Array.from(groups.values()).sort((left, right) =>
    left.categoryName.localeCompare(right.categoryName),
  );
}

function isLabelNameInCategory(labels: LabelView[], categoryName: string, labelName: string) {
  return labels.some((label) => label.categoryName === categoryName && label.name === labelName);
}

function isValidLegacyLabelColor(color: string) {
  return (
    /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(color) ||
    /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i.test(
      color,
    ) ||
    /^[a-z]+$/i.test(color)
  );
}

function formatLegacyLabelRequestFailure(
  error: unknown,
  messageKey: string,
): LegacyLabelFormMessage {
  if (error instanceof Error && error.message.length > 0) {
    return {
      args: [{ key: messageKey }],
      detail: { key: error.message },
      key: "label.failedTo",
    };
  }
  return { args: [{ key: messageKey }], key: "label.failedTo" };
}
