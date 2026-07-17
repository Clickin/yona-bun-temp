import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import {
  Fragment,
  useRef,
  useState,
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import {
  copyProjectLabelsRest,
  createProjectLabelRest,
  deleteProjectLabelRest,
  listProjectLabelsQueryOptions,
  updateProjectLabelCategoryRest,
  updateProjectLabelRest,
} from "../../../../api/project-labels";
import { readProjectSettingsQueryOptions } from "../../../../api/org-project";
import { apiQueryKeys } from "../../../../api/query-keys";
import type { ProjectContainer, YoramRecord } from "../../../../api/types";
import { readSessionBootstrap } from "../../../../auth-workspace-client";
import { LegacyI18nProvider, useLegacyMessages } from "../../../../i18n";
import { YoramQueryProvider } from "../../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../../runtime-config";
import { labelsFormColors } from "./-labelsform.stylex";

const styles = stylex.create({
  copyForm: { margin: "30px auto" },
  newForm: { margin: "30px auto" },
  formLegend: { display: "block", marginBottom: "10px" },
  formWrap: { display: "inline-block", position: "relative", verticalAlign: "top" },
  input: {
    borderColor: labelsFormColors.fieldBorder,
    borderStyle: "solid",
    borderWidth: "1px",
    color: labelsFormColors.mutedText,
    fontSize: "14px",
    lineHeight: "20px",
    padding: "4px 6px",
    width: "214px",
  },
  submitInfo: {
    backgroundColor: labelsFormColors.actionInfo,
    borderColor: labelsFormColors.actionBorder,
    borderStyle: "solid",
    borderWidth: "1px",
    color: labelsFormColors.white,
    cursor: "pointer",
    minWidth: "100px",
    padding: "4px 12px",
    textAlign: "center",
    verticalAlign: "top",
  },
  submitPrimary: {
    backgroundColor: labelsFormColors.actionPrimary,
    borderColor: labelsFormColors.actionPrimary,
    borderStyle: "solid",
    borderWidth: "1px",
    color: labelsFormColors.white,
    cursor: "pointer",
    minWidth: "100px",
    padding: "4px 12px",
    textAlign: "center",
    verticalAlign: "top",
  },
  list: { margin: "0 auto" },
  listHead: {
    backgroundColor: labelsFormColors.listSurface,
    borderTopColor: labelsFormColors.border,
    borderTopStyle: "solid",
    borderTopWidth: "2px",
  },
});

const NEW_LABEL_COLORS = [
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
const EDIT_LABEL_COLORS = [
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
const LEGACY_LINK_PROPS = {
  activeOptions: { exact: true, explicitUndefined: true, includeHash: true, includeSearch: true },
  activeProps: { "aria-current": undefined, className: undefined, "data-status": undefined },
};

export const Route = createFileRoute("/$ownerName/$projectName/issue/labelsform")({
  component: ProjectLabelsRoute,
});

function ProjectLabelsRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return <ProjectLabelsRouteScreen renderProjectShell={false} runtimeConfig={runtimeConfig} />;
}

export function ProjectLabelsRouteScreen({
  renderProjectShell = true,
  runtimeConfig,
}: {
  renderProjectShell?: boolean;
  runtimeConfig: RuntimeConfig;
}) {
  const content = (
    <ProjectLabelsRouteShell
      renderProjectShell={renderProjectShell}
      runtimeConfig={runtimeConfig}
    />
  );

  if (!renderProjectShell) {
    return content;
  }

  return (
    <YoramQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        {content}
      </LegacyI18nProvider>
    </YoramQueryProvider>
  );
}

function ProjectLabelsRouteShell({
  renderProjectShell,
  runtimeConfig,
}: {
  renderProjectShell: boolean;
  runtimeConfig: RuntimeConfig;
}) {
  const { ownerName, projectName } = Route.useParams();
  const projectQuery = useQuery(
    readProjectSettingsQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  return (
    <ProjectLabelsScreen
      project={projectQuery.data}
      renderProjectShell={renderProjectShell}
      runtimeConfig={runtimeConfig}
    />
  );
}

function ProjectLabelsScreen({
  project,
  renderProjectShell,
  runtimeConfig,
}: {
  project?: ProjectContainer;
  renderProjectShell: boolean;
  runtimeConfig: RuntimeConfig;
}) {
  const { ownerName, projectName } = Route.useParams();
  const { t } = useLegacyMessages();
  const labelsQuery = useQuery(
    listProjectLabelsQueryOptions(runtimeConfig, { ownerName, projectName }),
  );
  const legacyTitle = `${t("label")} - ${ownerName}/${projectName}`;

  if (!project || !labelsQuery.data) {
    return renderProjectShell ? <title>{legacyTitle}</title> : null;
  }

  return (
    <>
      {renderProjectShell ? <title>{legacyTitle}</title> : null}
      <ProjectLabelsBody
        labels={labelsQuery.data.labels}
        project={project}
        runtimeConfig={runtimeConfig}
      />
    </>
  );
}

function ProjectLabelsBody({
  labels,
  project,
  runtimeConfig,
}: {
  labels: YoramRecord[];
  project: ProjectContainer;
  runtimeConfig: RuntimeConfig;
}) {
  const { ownerName, projectName } = Route.useParams();
  const { t } = useLegacyMessages();
  const queryClient = useQueryClient();
  const labelCategories = groupedLabels(labels);
  const canManageIssueLabels = projectCanManageIssueLabels(project);
  const categoryTypeaheadSource = buildCategoryTypeaheadSource(labelCategories);
  const [newLabelColor, setNewLabelColor] = useState("");
  const [isNewLabelColorsVisible, setIsNewLabelColorsVisible] = useState(false);
  const [newLabelNameColor, setNewLabelNameColor] = useState("");
  const [categoryTypeaheadQuery, setCategoryTypeaheadQuery] = useState("");
  const [isCategoryTypeaheadOpen, setIsCategoryTypeaheadOpen] = useState(false);
  const [activeCategorySuggestionIndex, setActiveCategorySuggestionIndex] = useState(0);
  const [editingCategory, setEditingCategory] = useState<EditableCategory | null>(null);
  const [editingLabel, setEditingLabel] = useState<EditableLabel | null>(null);
  const [pendingCategoryCreation, setPendingCategoryCreation] =
    useState<PendingCategoryCreation | null>(null);
  const [pendingLabelDeletion, setPendingLabelDeletion] = useState<string | null>(null);
  const newLabelCategoryInputRef = useRef<HTMLInputElement>(null);
  const categoryTypeaheadSuggestions = legacyTypeaheadSuggestions(
    categoryTypeaheadSource,
    categoryTypeaheadQuery,
  );
  const showCategoryTypeahead =
    isCategoryTypeaheadOpen &&
    categoryTypeaheadQuery.trim().length > 0 &&
    categoryTypeaheadSuggestions.length > 0;
  const copyMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return copyProjectLabelsRest(runtimeConfig, csrfToken, {
        fromOwnerName: String(formData.get("owner") ?? ""),
        fromProjectName: String(formData.get("projectName") ?? ""),
        ownerName,
        projectName,
      });
    },
    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.labels(ownerName, projectName),
      });
    },
  });
  const createMutation = useMutation({
    mutationFn: async ({
      categoryName,
      categoryIsExclusive,
      labelColor,
      labelName,
    }: {
      categoryName: string;
      categoryIsExclusive?: boolean;
      labelColor: string;
      labelName: string;
    }) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return createProjectLabelRest(runtimeConfig, csrfToken, {
        categoryIsExclusive,
        categoryName,
        labelColor,
        labelName,
        ownerName,
        projectName,
      });
    },
    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.labels(ownerName, projectName),
      });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: async (labelId: string) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return deleteProjectLabelRest(runtimeConfig, csrfToken, {
        labelId: Number(labelId),
        ownerName,
        projectName,
      });
    },
    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.labels(ownerName, projectName),
      });
    },
  });
  const updateLabelMutation = useMutation({
    mutationFn: async (label: EditableLabel) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return updateProjectLabelRest(runtimeConfig, csrfToken, {
        categoryId: Number(label.categoryId),
        labelColor: label.color,
        labelId: Number(label.id),
        labelName: label.name.trim(),
        ownerName,
        projectName,
      });
    },
    onSuccess() {
      setEditingLabel(null);
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.labels(ownerName, projectName),
      });
    },
  });
  const updateCategoryMutation = useMutation({
    mutationFn: async (category: EditableCategory) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return updateProjectLabelCategoryRest(runtimeConfig, csrfToken, {
        categoryId: Number(category.id),
        categoryIsExclusive: category.isExclusive,
        categoryName: category.name.trim(),
        ownerName,
        projectName,
      });
    },
    onSuccess() {
      setEditingCategory(null);
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.labels(ownerName, projectName),
      });
    },
  });

  function onCopy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    copyMutation.mutate(new FormData(event.currentTarget));
  }

  function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCategoryTypeaheadOpen(false);
    setActiveCategorySuggestionIndex(0);
    const formData = new FormData(event.currentTarget);
    const categoryName = String(formData.get("category") ?? "").trim();
    const labelName = String(formData.get("name") ?? "").trim();
    const refinedColor = refineHexColor(String(formData.get("color") ?? "").trim());
    if (!categoryName || !labelName || !refinedColor) {
      window.alert(`${t("label.failedTo", { args: [t("label.add")] })}\n${t("label.error.empty")}`);
      return;
    }
    formData.set("category", categoryName);
    formData.set("name", labelName);
    formData.set("color", refinedColor);
    if (isLabelExists(labels, categoryName, labelName)) {
      window.alert(t("label.error.duplicated"));
      return;
    }
    const existingCategory = labelCategories.some((category) => category.name === categoryName);
    const draft = {
      categoryName,
      labelColor: refinedColor,
      labelName,
    };
    if (!existingCategory) {
      setPendingCategoryCreation(draft);
      return;
    }
    createMutation.mutate(draft);
  }

  function selectCategoryTypeaheadSuggestion(categoryName: string) {
    setCategoryTypeaheadQuery(categoryName);
    setIsCategoryTypeaheadOpen(false);
    setActiveCategorySuggestionIndex(0);
  }

  function onCategoryInputBlur(event: FocusEvent<HTMLInputElement>) {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof HTMLElement && nextTarget.closest(".typeahead.dropdown-menu")) {
      return;
    }
    setIsCategoryTypeaheadOpen(false);
  }

  function onCategoryInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setIsCategoryTypeaheadOpen(false);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const activeSuggestion =
        categoryTypeaheadSuggestions[activeCategorySuggestionIndex] ??
        categoryTypeaheadSuggestions[0];
      if (showCategoryTypeahead && activeSuggestion) {
        selectCategoryTypeaheadSuggestion(activeSuggestion.value);
      }
      return;
    }
    if (!showCategoryTypeahead) {
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveCategorySuggestionIndex(
        (current) => (current + 1) % categoryTypeaheadSuggestions.length,
      );
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveCategorySuggestionIndex(
        (current) =>
          (current - 1 + categoryTypeaheadSuggestions.length) % categoryTypeaheadSuggestions.length,
      );
    }
  }

  function onNameFocus() {
    setIsNewLabelColorsVisible(true);
    if (newLabelColor) {
      return;
    }
    const categoryName = categoryTypeaheadQuery.trim();
    const existingCategory = labelCategories.find((category) => category.name === categoryName);
    const fallbackColor =
      stringField(
        existingCategory?.labels[0] ? recordField(existingCategory.labels[0]).color : "",
        "",
      ) || NEW_LABEL_COLORS[new Date().getTime() % NEW_LABEL_COLORS.length];
    const refinedColor = refineHexColor(fallbackColor) || fallbackColor;
    setNewLabelColor(refinedColor);
    setNewLabelNameColor(refinedColor);
  }

  function onNewLabelColorChange(color: string) {
    setNewLabelColor(color);
    const refinedColor = refineHexColor(color);
    if (refinedColor) {
      setNewLabelNameColor(refinedColor);
    }
  }

  function onNewLabelColorBlur() {
    const color = newLabelColor;
    if (!color) {
      return;
    }
    const refinedColor = refineHexColor(color);
    if (!refinedColor) {
      window.alert(t("label.error.color", { args: [color] }));
      return;
    }
    setNewLabelColor(refinedColor);
    setNewLabelNameColor(refinedColor);
  }

  return (
    <>
      <div className="page-wrap-outer">
        <div
          className="project-page-wrap label-editor-wrap"
          data-stylex-owner="project-labels-form-page"
        >
          <ProjectSettingMenu
            active="labels"
            ownerName={ownerName}
            project={project}
            projectName={projectName}
          />

          {canManageIssueLabels ? (
            <>
              <form
                id="copyLabel"
                action={prefixBasePath(
                  runtimeConfig.basePath,
                  `/${ownerName}/${projectName}/copyLabels`,
                )}
                method="post"
                {...stylex.props(styles.copyForm)}
                className={stylex.props(styles.copyForm).className}
                data-stylex-owner="project-labels-copy-form"
                onSubmit={onCopy}
              >
                <strong
                  {...stylex.props(styles.formLegend)}
                  className={stylex.props(styles.formLegend).className}
                  data-stylex-owner="project-labels-copy-legend"
                >
                  {t("label.copy.append")}
                </strong>
                <div
                  {...stylex.props(styles.formWrap)}
                  className={stylex.props(styles.formWrap).className}
                >
                  <input
                    type="text"
                    name="owner"
                    {...stylex.props(styles.input)}
                    className={`${stylex.props(styles.input).className} mr5`}
                    placeholder={t("project.owner")}
                  />
                  <input
                    type="text"
                    name="projectName"
                    {...stylex.props(styles.input)}
                    className={stylex.props(styles.input).className}
                    placeholder={t("project.name")}
                  />
                </div>
                <button
                  {...stylex.props(styles.submitInfo)}
                  type="submit"
                  className={stylex.props(styles.submitInfo).className}
                  data-stylex-owner="project-labels-copy-submit"
                >
                  {t("label.copy")}
                </button>
                <div>{t("label.copy.description")}</div>
                <div>{t("label.copy.description2")}</div>
              </form>
              <form
                id="frmNewLabel"
                action={prefixBasePath(
                  runtimeConfig.basePath,
                  `/${ownerName}/${projectName}/issue/labels`,
                )}
                method="post"
                {...stylex.props(styles.newForm)}
                className={stylex.props(styles.newForm).className}
                data-stylex-owner="project-labels-new-form"
                onSubmit={onCreate}
              >
                <strong
                  {...stylex.props(styles.formLegend)}
                  className={stylex.props(styles.formLegend).className}
                >
                  {t("label.new")}
                </strong>
                <div
                  {...stylex.props(styles.formWrap)}
                  className={stylex.props(styles.formWrap).className}
                >
                  <div style={showCategoryTypeahead ? { position: "relative" } : undefined}>
                    <input
                      type="text"
                      name="category"
                      {...stylex.props(styles.input)}
                      className={`${stylex.props(styles.input).className} mr5`}
                      maxLength={250}
                      autoComplete="off"
                      placeholder={t("label.category")}
                      ref={newLabelCategoryInputRef}
                      value={categoryTypeaheadQuery}
                      onBlur={onCategoryInputBlur}
                      onChange={(event) => {
                        const nextQuery = event.currentTarget.value;
                        setCategoryTypeaheadQuery(nextQuery);
                        setActiveCategorySuggestionIndex(0);
                        setIsCategoryTypeaheadOpen(nextQuery.trim() !== "");
                      }}
                      onFocus={() => {
                        if (
                          categoryTypeaheadQuery.trim().length > 0 &&
                          categoryTypeaheadSuggestions.length > 0
                        ) {
                          setIsCategoryTypeaheadOpen(true);
                        }
                      }}
                      onKeyDown={onCategoryInputKeyDown}
                    />
                    <input
                      type="text"
                      name="name"
                      maxLength={250}
                      autoComplete="off"
                      placeholder={t("label.name")}
                      onFocus={onNameFocus}
                      style={newLabelNameColor ? { backgroundColor: newLabelNameColor } : undefined}
                      {...stylex.props(styles.input)}
                      className={`${stylex.props(styles.input).className}${contrastClass(newLabelNameColor)}`}
                    />
                    {showCategoryTypeahead ? (
                      <ul
                        className="typeahead dropdown-menu"
                        style={typeaheadMenuStyle(newLabelCategoryInputRef.current)}
                      >
                        {categoryTypeaheadSuggestions.map((suggestion, index) => (
                          <li
                            className={
                              index === activeCategorySuggestionIndex ? "active" : undefined
                            }
                            data-value={suggestion.value}
                            key={suggestion.value}
                            onMouseEnter={() => setActiveCategorySuggestionIndex(index)}
                          >
                            <button
                              type="button"
                              style={{
                                background: "transparent",
                                border: 0,
                                display: "block",
                                padding: "3px 20px",
                                textAlign: "left",
                                width: "100%",
                              }}
                              onClick={() => selectCategoryTypeaheadSuggestion(suggestion.value)}
                            >
                              {suggestion.parts.map((part, partIndex) =>
                                part.isMatch ? (
                                  <strong key={`${suggestion.value}-${partIndex}`}>
                                    {part.text}
                                  </strong>
                                ) : (
                                  <Fragment key={`${suggestion.value}-${partIndex}`}>
                                    {part.text}
                                  </Fragment>
                                ),
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <div
                    className="label-preset-colors"
                    style={isNewLabelColorsVisible ? { display: "inline-block" } : undefined}
                  >
                    {NEW_LABEL_COLORS.map((color) => (
                      <ColorButton
                        color={color}
                        isActive={newLabelColor.toLowerCase() === color.toLowerCase()}
                        key={color}
                        onSelect={() => onNewLabelColorChange(color)}
                      />
                    ))}
                    <input
                      type="text"
                      name="color"
                      className="input-small input-label-color"
                      placeholder={t("label.customColor")}
                      value={newLabelColor}
                      onBlur={onNewLabelColorBlur}
                      onChange={(event) => {
                        setNewLabelColor(event.currentTarget.value);
                        const refinedColor = refineHexColor(event.currentTarget.value);
                        if (refinedColor) {
                          setNewLabelNameColor(refinedColor);
                        }
                      }}
                      style={colorInputStyle(newLabelNameColor)}
                    />
                  </div>
                </div>
                <button
                  {...stylex.props(styles.submitPrimary)}
                  type="submit"
                  className={stylex.props(styles.submitPrimary).className}
                  data-stylex-owner="project-labels-new-submit"
                >
                  {t("label.add")}
                </button>
              </form>
            </>
          ) : null}

          <div
            {...stylex.props(styles.list)}
            id="labelsList"
            className={stylex.props(styles.list).className}
            data-stylex-owner="project-labels-list"
          >
            <ProjectLabelsList
              basePath={runtimeConfig.basePath}
              onDeleteLabel={setPendingLabelDeletion}
              onEditCategory={setEditingCategory}
              onEditLabel={setEditingLabel}
              canManageIssueLabels={canManageIssueLabels}
              labels={labels}
              ownerName={ownerName}
              project={project}
              projectName={projectName}
            />
          </div>
        </div>
      </div>
      <EditCategoryModal
        category={editingCategory}
        onCancel={() => setEditingCategory(null)}
        onChange={setEditingCategory}
        onSubmit={() => {
          if (editingCategory) {
            updateCategoryMutation.mutate(editingCategory);
          }
        }}
      />
      <EditLabelModal
        label={editingLabel}
        labels={labels}
        onCancel={() => setEditingLabel(null)}
        onChange={setEditingLabel}
        onSubmit={() => {
          if (!editingLabel) {
            return;
          }
          const refinedColor = refineHexColor(editingLabel.color);
          if (!refinedColor) {
            window.alert(t("label.error.color", { args: [editingLabel.color] }));
            return;
          }
          updateLabelMutation.mutate({ ...editingLabel, color: refinedColor });
        }}
      />
      {pendingCategoryCreation ? (
        <IssueLabelConfirmModal
          buttons={[
            {
              className: "ybtn confirm-button-vertical",
              label: t("label.category.option.multiple"),
              onClick: () => {
                const draft = pendingCategoryCreation;
                setPendingCategoryCreation(null);
                createMutation.mutate({ ...draft, categoryIsExclusive: false });
              },
            },
            {
              className: "ybtn confirm-button-vertical",
              label: t("label.category.option.single"),
              onClick: () => {
                const draft = pendingCategoryCreation;
                setPendingCategoryCreation(null);
                createMutation.mutate({ ...draft, categoryIsExclusive: true });
              },
            },
          ]}
          id="newCategoryConfirm"
          message={t("label.category.new.confirm", {
            args: [pendingCategoryCreation.categoryName],
          })}
          onDismiss={() => setPendingCategoryCreation(null)}
        />
      ) : null}
      {pendingLabelDeletion ? (
        <IssueLabelConfirmModal
          buttons={[
            {
              className: "ybtn ybtn-default",
              label: t("button.cancel"),
              onClick: () => setPendingLabelDeletion(null),
            },
            {
              className: "ybtn ybtn-primary",
              label: t("button.confirm"),
              onClick: () => {
                const labelId = pendingLabelDeletion;
                setPendingLabelDeletion(null);
                deleteMutation.mutate(labelId);
              },
            },
          ]}
          id="deleteLabelConfirm"
          message={t("label.confirm.delete")}
          onDismiss={() => setPendingLabelDeletion(null)}
        />
      ) : null}
    </>
  );
}

function ProjectLabelsList({
  basePath,
  canManageIssueLabels,
  labels,
  onDeleteLabel,
  onEditCategory,
  onEditLabel,
  ownerName,
  project,
  projectName,
}: {
  basePath: string;
  canManageIssueLabels: boolean;
  labels: YoramRecord[];
  onDeleteLabel: (labelId: string) => void;
  onEditCategory: (category: EditableCategory) => void;
  onEditLabel: (label: EditableLabel) => void;
  ownerName: string;
  project: ProjectContainer;
  projectName: string;
}) {
  const { t } = useLegacyMessages();

  if (labels.length === 0) {
    return (
      <div className="error-wrap">
        <i className="ico ico-err1"></i>
        <p>{t("label.list.empty")}</p>
      </div>
    );
  }

  const categories = groupedLabels(labels);
  const projectIdValue = projectId(project);

  return (
    <>
      <div
        {...stylex.props(styles.listHead)}
        className="row-fluid list-head"
        data-stylex-owner="project-labels-list-head"
      >
        <div className="span3 category">
          <strong>{t("label.category")}</strong>
        </div>
        <div className="span9 name">
          <strong>{t("label.name")}</strong>
        </div>
      </div>
      {categories.map((category) => (
        <div
          className="row-fluid list-item category-wrap"
          data-category={category.id}
          data-category-name={category.name}
          key={category.id || category.name}
        >
          <div className="span3">
            <h5 className="right-txt mr20">
              <span className="category-name">{category.name}</span>
              <p className="mt5">
                <i
                  className={`category-exclusive ${category.isExclusive ? "yobicon-tag single" : "yobicon-tags multiple"}`}
                  data-html="true"
                  title={`${t("label.category.option")}<br>${t(
                    category.isExclusive
                      ? "label.category.option.single"
                      : "label.category.option.multiple",
                  )}`}
                ></i>
                {canManageIssueLabels ? (
                  <button
                    type="button"
                    className="ybtn ybtn-mini"
                    data-project-id={projectIdValue}
                    data-category-id={category.id}
                    data-category-name={category.name}
                    data-category-is-exclusive={String(category.isExclusive)}
                    onClick={() => onEditCategory(category)}
                  >
                    {t("label.category.edit")}
                  </button>
                ) : null}
              </p>
            </h5>
          </div>
          <div className="span9">
            <table className="table nm">
              <tbody>
                {category.labels.map((label) => {
                  const labelId = stringField(label.id, "");
                  const labelName = stringField(label.name, "");
                  return (
                    <tr data-label-id={labelId} key={labelId || labelName}>
                      <td>
                        <span
                          className="issue-label active"
                          data-label-id={labelId}
                          data-label-name={labelName}
                        >
                          {labelName}
                        </span>
                      </td>
                      <td className="actions">
                        {canManageIssueLabels ? (
                          <>
                            <button
                              type="button"
                              className="ybtn ybtn-danger ybtn-small"
                              data-category-name={category.name}
                              data-label-id={labelId}
                              onClick={() => onDeleteLabel(labelId)}
                            >
                              {t("button.delete")}
                            </button>
                            <button
                              type="button"
                              className="ybtn ybtn-small"
                              data-category-id={category.id}
                              data-label-name={labelName}
                              data-label-color={stringField(label.color, "")}
                              onClick={() =>
                                onEditLabel({
                                  categoryId: category.id,
                                  color: stringField(label.color, ""),
                                  id: labelId,
                                  name: labelName,
                                })
                              }
                            >
                              {t("button.edit")}
                            </button>
                          </>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      <link
        rel="stylesheet"
        type="text/css"
        href={prefixBasePath(basePath, `/${ownerName}/${projectName}/issue/labels.css`)}
      />
    </>
  );
}

function groupedLabels(labels: YoramRecord[]) {
  const categories = new Map<
    string,
    { id: string; isExclusive: boolean; labels: YoramRecord[]; name: string }
  >();

  for (const label of labels) {
    const id = stringField(label.categoryId, "");
    const name = stringField(label.category, "");
    const key = id || name;
    const existing = categories.get(key);
    if (existing) {
      existing.labels.push(label);
      continue;
    }
    categories.set(key, {
      id,
      isExclusive: booleanField(label.categoryIsExclusive),
      labels: [label],
      name,
    });
  }

  return Array.from(categories.values());
}

function legacyTypeaheadSuggestions(source: string[], query: string) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  return legacyTypeaheadSorter(
    source.filter((item) => item.toLowerCase().includes(trimmedQuery.toLowerCase())),
    trimmedQuery,
  )
    .slice(0, 8)
    .map((value) => ({
      parts: legacyTypeaheadHighlight(value, trimmedQuery),
      value,
    }));
}

function legacyTypeaheadSorter(source: string[], query: string) {
  const beginsWith: string[] = [];
  const caseSensitive: string[] = [];
  const caseInsensitive: string[] = [];
  const lowerQuery = query.toLowerCase();
  const caseSensitiveMatcher = new RegExp(escapeTypeaheadRegExp(query));

  for (const item of source) {
    const lowerItem = item.toLowerCase();
    if (lowerItem.startsWith(lowerQuery)) {
      beginsWith.push(item);
      continue;
    }
    if (caseSensitiveMatcher.test(item)) {
      caseSensitive.push(item);
      continue;
    }
    caseInsensitive.push(item);
  }

  return beginsWith.concat(caseSensitive, caseInsensitive);
}

function legacyTypeaheadHighlight(value: string, query: string) {
  const matcher = new RegExp(`(${escapeTypeaheadRegExp(query)})`, "ig");
  const parts: Array<{ isMatch: boolean; text: string }> = [];
  let lastIndex = 0;

  for (const match of value.matchAll(matcher)) {
    const start = match.index ?? 0;
    const matchedText = match[0];

    if (start > lastIndex) {
      parts.push({ isMatch: false, text: value.slice(lastIndex, start) });
    }

    parts.push({ isMatch: true, text: matchedText });
    lastIndex = start + matchedText.length;
  }

  if (lastIndex < value.length) {
    parts.push({ isMatch: false, text: value.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ isMatch: false, text: value }];
}

function escapeTypeaheadRegExp(value: string) {
  return value.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

function typeaheadMenuStyle(input: HTMLInputElement | null) {
  return {
    display: "block",
    left: 0,
    minWidth: input ? `${input.offsetWidth}px` : undefined,
    position: "absolute" as const,
    top: input ? `${input.offsetHeight}px` : undefined,
  };
}

function buildCategoryTypeaheadSource(
  categories: Array<{ id: string; isExclusive: boolean; labels: YoramRecord[]; name: string }>,
) {
  const seen = new Set<string>();
  const source: string[] = [];

  for (const category of categories) {
    if (!category.name || seen.has(category.name)) {
      continue;
    }
    seen.add(category.name);
    source.push(category.name);
  }

  return source;
}

type EditableCategory = {
  id: string;
  isExclusive: boolean;
  name: string;
};

type EditableLabel = {
  categoryId: string;
  color: string;
  id: string;
  name: string;
};

type PendingCategoryCreation = {
  categoryName: string;
  labelColor: string;
  labelName: string;
};

type IssueLabelConfirmButton = {
  className: string;
  label: string;
  onClick: () => void;
};

function handleIssueLabelModalButtonClick(
  event: MouseEvent<HTMLButtonElement>,
  onClick: () => void,
) {
  event.preventDefault();
  event.stopPropagation();
  onClick();
}

function dismissIssueLabelModalButtonClick(
  event: MouseEvent<HTMLButtonElement>,
  onCancel: () => void,
) {
  handleIssueLabelModalButtonClick(event, onCancel);
}

function activateLabelSelectOption(event: KeyboardEvent<HTMLElement>, activate: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    activate();
  }
}

function LegacyDialogText({ className, text }: { className: string; text: string }) {
  const lineOccurrences = new Map<string, number>();
  const lines = text.split(/<br\s*\/?>/iu).map((line) => {
    const occurrence = (lineOccurrences.get(line) ?? 0) + 1;
    lineOccurrences.set(line, occurrence);
    return {
      isFirst: lineOccurrences.size === 1 && occurrence === 1,
      key: `${line}:${occurrence}`,
      line,
    };
  });

  return (
    <p className={className}>
      {lines.map((line) => (
        <Fragment key={line.key}>
          {line.isFirst ? null : <br />}
          {line.line}
        </Fragment>
      ))}
    </p>
  );
}

function IssueLabelConfirmModal({
  buttons,
  description = "",
  id,
  message,
  onDismiss,
}: {
  buttons: IssueLabelConfirmButton[];
  description?: string;
  id: string;
  message: string;
  onDismiss: () => void;
}) {
  return (
    <>
      <div id={id} className="modal in yobiDialog" tabIndex={-1} role="dialog" aria-hidden="false">
        <div className="btn-dismiss">
          <button
            type="button"
            className="btn-transparent"
            onClick={(event) => dismissIssueLabelModalButtonClick(event, onDismiss)}
          >
            ×
          </button>
        </div>
        <div className="message">
          <div className="center-text">
            <LegacyDialogText className="msg" text={message} />
            <LegacyDialogText className="desc" text={description} />
          </div>
          <div className="center-txt buttons">
            {buttons.map((button) => (
              <button
                type="button"
                className={button.className}
                key={button.label}
                onClick={(event) => handleIssueLabelModalButtonClick(event, button.onClick)}
              >
                {button.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="modal-backdrop in"></div>
    </>
  );
}

function EditCategoryModal({
  category,
  onCancel,
  onChange,
  onSubmit,
}: {
  category: EditableCategory | null;
  onCancel: () => void;
  onChange: (category: EditableCategory) => void;
  onSubmit: () => void;
}) {
  const { t } = useLegacyMessages();
  const [isExclusiveSelectOpen, setIsExclusiveSelectOpen] = useState(false);

  return (
    <>
      <div
        id="editCategory"
        className={`modal${category ? " in" : " hide"} yobiDialog`}
        tabIndex={-1}
        role="dialog"
        aria-hidden={category ? "false" : "true"}
      >
        <div className="btn-dismiss">
          <button
            type="button"
            className="btn-transparent"
            onClick={(event) => dismissIssueLabelModalButtonClick(event, onCancel)}
          >
            ×
          </button>
        </div>
        <div className="message edit-label-category-form">
          <div className="center-txt">
            <input
              key={category ? `category-name-${category.id}` : "category-name-empty"}
              type="text"
              name="name"
              className="text category-name"
              placeholder={t("label.category")}
              value={category?.name || undefined}
              onChange={(event) =>
                category && onChange({ ...category, name: event.currentTarget.value })
              }
            />

            <div className="desc">
              {t("label.category.option")}
              <select
                key={category ? `category-exclusive-${category.id}` : "category-exclusive-empty"}
                name="isExclusive"
                data-dropdown-css-class="select2-without-searchbox"
                className="select2-offscreen"
                value={category ? String(category.isExclusive) : undefined}
                onChange={(event) =>
                  category &&
                  onChange({ ...category, isExclusive: event.currentTarget.value === "true" })
                }
              >
                <option value="false">{t("label.category.option.multiple")}</option>
                <option value="true">{t("label.category.option.single")}</option>
              </select>
              <div
                className={`select2-container${isExclusiveSelectOpen ? " select2-dropdown-open" : ""}`}
              >
                <div
                  className="select2-choice"
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExclusiveSelectOpen}
                  onClick={() => setIsExclusiveSelectOpen((current) => !current)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setIsExclusiveSelectOpen((current) => !current);
                    }
                  }}
                >
                  <span className="select2-chosen">
                    {t(
                      category?.isExclusive
                        ? "label.category.option.single"
                        : "label.category.option.multiple",
                    )}
                  </span>
                  <span className="select2-arrow" aria-hidden="true">
                    <b></b>
                  </span>
                </div>
                <input
                  className="select2-focusser select2-offscreen"
                  type="text"
                  autoComplete="off"
                  aria-label={t("label.category.option")}
                />
                <div
                  className={`select2-drop select2-without-searchbox select2-with-searchbox${isExclusiveSelectOpen ? " select2-drop-active" : " select2-display-none"}`}
                >
                  <div className="select2-search">
                    <input
                      type="text"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      className="select2-input"
                      aria-label={t("label.category.option")}
                    />
                  </div>
                  <ul className="select2-results" role="listbox">
                    <li>
                      <div
                        className="select2-result-label"
                        role="option"
                        tabIndex={0}
                        aria-selected={!category?.isExclusive}
                        onClick={() => {
                          if (category) onChange({ ...category, isExclusive: false });
                          setIsExclusiveSelectOpen(false);
                        }}
                        onKeyDown={(event) =>
                          activateLabelSelectOption(event, () => {
                            if (category) onChange({ ...category, isExclusive: false });
                            setIsExclusiveSelectOpen(false);
                          })
                        }
                      >
                        {t("label.category.option.multiple")}
                      </div>
                    </li>
                    <li>
                      <div
                        className="select2-result-label"
                        role="option"
                        tabIndex={0}
                        aria-selected={category?.isExclusive ?? false}
                        onClick={() => {
                          if (category) onChange({ ...category, isExclusive: true });
                          setIsExclusiveSelectOpen(false);
                        }}
                        onKeyDown={(event) =>
                          activateLabelSelectOption(event, () => {
                            if (category) onChange({ ...category, isExclusive: true });
                            setIsExclusiveSelectOpen(false);
                          })
                        }
                      >
                        {t("label.category.option.single")}
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="center-txt buttons mt20 mb20">
            <button type="button" className="ybtn ybtn-info btnSubmit" onClick={onSubmit}>
              {t("button.save")}
            </button>
            <button
              type="button"
              className="ybtn ybtn-default"
              onClick={(event) => dismissIssueLabelModalButtonClick(event, onCancel)}
            >
              {t("button.cancel")}
            </button>
          </div>
        </div>
      </div>
      {category ? <div className="modal-backdrop in"></div> : null}
    </>
  );
}

function EditLabelModal({
  label,
  labels,
  onCancel,
  onChange,
  onSubmit,
}: {
  label: EditableLabel | null;
  labels: YoramRecord[];
  onCancel: () => void;
  onChange: (label: EditableLabel) => void;
  onSubmit: () => void;
}) {
  const { t } = useLegacyMessages();
  const [isCategorySelectOpen, setIsCategorySelectOpen] = useState(false);
  const categoriesById = new Map<string, { id: string; name: string }>();
  for (const label of labels) {
    const id = stringField(label.categoryId, "");
    if (id) {
      categoriesById.set(id, { id, name: stringField(label.category, "") });
    }
  }
  const categories = Array.from(categoriesById.values());

  return (
    <>
      <div
        id="editLabel"
        className={`modal${label ? " in" : " hide"} yobiDialog`}
        tabIndex={-1}
        role="dialog"
        aria-hidden={label ? "false" : "true"}
      >
        <div className="btn-dismiss">
          <button
            type="button"
            className="btn-transparent"
            onClick={(event) => dismissIssueLabelModalButtonClick(event, onCancel)}
          >
            ×
          </button>
        </div>
        <div className="message edit-label-form">
          <div className="center-txt">
            <select
              key={label ? `label-category-${label.id}` : "label-category-empty"}
              name="category.id"
              className="select2-offscreen"
              value={label?.categoryId || undefined}
              onChange={(event) =>
                label && onChange({ ...label, categoryId: event.currentTarget.value })
              }
            >
              {categories.map((category) => (
                <option value={category.id} key={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <div
              className={`select2-container${isCategorySelectOpen ? " select2-dropdown-open" : ""}`}
            >
              <div
                className="select2-choice"
                role="button"
                tabIndex={0}
                aria-expanded={isCategorySelectOpen}
                onClick={() => setIsCategorySelectOpen((current) => !current)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setIsCategorySelectOpen((current) => !current);
                  }
                }}
              >
                <span className="select2-chosen">
                  {categories.find((category) => category.id === label?.categoryId)?.name ??
                    categories[0]?.name}
                </span>
                <span className="select2-arrow" aria-hidden="true">
                  <b></b>
                </span>
              </div>
              <input
                className="select2-focusser select2-offscreen"
                type="text"
                autoComplete="off"
                aria-label={t("label.category")}
              />
              <div
                className={`select2-drop select2-with-searchbox${isCategorySelectOpen ? " select2-drop-active" : " select2-display-none"}`}
              >
                <div className="select2-search">
                  <input
                    type="text"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    className="select2-input"
                    aria-label={t("label.category")}
                  />
                </div>
                <ul className="select2-results" role="listbox">
                  {categories.map((category) => (
                    <li key={category.id}>
                      <div
                        className="select2-result-label"
                        role="option"
                        tabIndex={0}
                        aria-selected={category.id === label?.categoryId}
                        onClick={() => {
                          if (label) onChange({ ...label, categoryId: category.id });
                          setIsCategorySelectOpen(false);
                        }}
                        onKeyDown={(event) =>
                          activateLabelSelectOption(event, () => {
                            if (label) onChange({ ...label, categoryId: category.id });
                            setIsCategorySelectOpen(false);
                          })
                        }
                      >
                        {category.name}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <input
              key={label ? `label-name-${label.id}` : "label-name-empty"}
              type="text"
              name="name"
              className="text input-label-name"
              maxLength={250}
              placeholder={t("label.name")}
              value={label?.name || undefined}
              onChange={(event) => label && onChange({ ...label, name: event.currentTarget.value })}
              style={label?.color ? { backgroundColor: label.color } : undefined}
            />

            <div className="label-preset-colors edit">
              {EDIT_LABEL_COLORS.map((color) => (
                <ColorButton
                  color={color}
                  isActive={label?.color.toLowerCase() === color.toLowerCase()}
                  key={color}
                  onSelect={() => label && onChange({ ...label, color })}
                />
              ))}
              <input
                key={label ? `label-color-${label.id}` : "label-color-empty"}
                type="text"
                name="color"
                className="input-small input-label-color"
                placeholder={t("label.customColor")}
                value={label?.color || undefined}
                onChange={(event) =>
                  label && onChange({ ...label, color: event.currentTarget.value })
                }
                style={colorInputStyle(label?.color ?? "")}
              />
            </div>
          </div>
          <div className="center-txt buttons mt20 mb20">
            <button type="button" className="ybtn ybtn-info btnSubmit" onClick={onSubmit}>
              {t("button.save")}
            </button>
            <button
              type="button"
              className="ybtn ybtn-default"
              onClick={(event) => dismissIssueLabelModalButtonClick(event, onCancel)}
            >
              {t("button.cancel")}
            </button>
          </div>
        </div>
      </div>
      {label ? <div className="modal-backdrop in"></div> : null}
    </>
  );
}

function ColorButton({
  color,
  isActive = false,
  onSelect,
}: {
  color: string;
  isActive?: boolean;
  onSelect?: () => void;
}) {
  return (
    <button
      type="button"
      className={`issue-label btn-preset-color${isActive ? " active" : ""}`}
      style={{ backgroundColor: color }}
      onClick={onSelect}
    ></button>
  );
}

function ProjectSettingMenu({
  active,
  ownerName,
  project,
  projectName,
}: {
  active: "labels";
  ownerName: string;
  project: ProjectContainer;
  projectName: string;
}) {
  const { t } = useLegacyMessages();
  const menuSetting = projectMenuSetting(project);
  const memberCount = enrolledUserCount(project);

  return (
    <ul className="nav nav-tabs">
      <li id="subMenuProjectSetting" className="">
        <Link
          {...LEGACY_LINK_PROPS}
          to="/$ownerName/$projectName/setting"
          params={{ ownerName, projectName }}
        >
          {t("project.setting")}
        </Link>
      </li>
      <li id="subMenuProjectMember" className="">
        <Link
          {...LEGACY_LINK_PROPS}
          to="/$ownerName/$projectName/members"
          params={{ ownerName, projectName }}
        >
          {t("project.member")}
          <CountBadge count={memberCount} className="num-badge" />
        </Link>
      </li>
      <li id="subMenuIssueLabel" className={active === "labels" ? "active" : ""}>
        <Link
          {...LEGACY_LINK_PROPS}
          to="/$ownerName/$projectName/issue/labelsform"
          params={{ ownerName, projectName }}
          hash="labelsform-active-sentinel"
          mask={{
            to: "/$ownerName/$projectName/issue/labelsform",
            params: { ownerName, projectName },
          }}
        >
          {t("issue.label")}
        </Link>
      </li>
      <li id="subMenuWebhook" className="">
        <Link
          {...LEGACY_LINK_PROPS}
          to="/$ownerName/$projectName/webhooks"
          params={{ ownerName, projectName }}
        >
          {t("project.webhook")}
        </Link>
      </li>
      <li id="subMenuProjectTransfer" className="">
        <Link
          {...LEGACY_LINK_PROPS}
          to="/$ownerName/$projectName/transfer"
          params={{ ownerName, projectName }}
        >
          {t("project.transfer")}
        </Link>
      </li>
      <li id="subMenuProjectDelete" className="">
        <Link
          {...LEGACY_LINK_PROPS}
          to="/$ownerName/$projectName/deleteform"
          params={{ ownerName, projectName }}
        >
          {t("project.delete")}
        </Link>
      </li>
      <li
        id="subMenuProjectChangeVCS"
        className=""
        style={booleanField(menuSetting.code) ? undefined : { display: "none" }}
      >
        <Link
          {...LEGACY_LINK_PROPS}
          to="/$ownerName/$projectName/changeVCS"
          params={{ ownerName, projectName }}
        >
          {t("project.changeVCS")}
        </Link>
      </li>
    </ul>
  );
}

function CountBadge({
  className = "project-menu-count",
  count,
}: {
  className?: string;
  count: number;
}) {
  return count > 0 ? <span className={className}>{count}</span> : null;
}

function enrolledUserCount(project: ProjectContainer) {
  const enrolledUsers = recordField(project).enrolledUsers;
  return Array.isArray(enrolledUsers) ? enrolledUsers.length : 0;
}

function projectMenuSetting(project: ProjectContainer) {
  const record = recordField(project);
  const nested = recordField(record.menuSetting);
  return {
    board: nested.board ?? record.showBoard,
    code: nested.code ?? record.showCode,
    issue: nested.issue ?? record.showIssue,
    milestone: nested.milestone ?? record.showMilestone,
    pullRequest: nested.pullRequest ?? record.showPullRequest,
    review: nested.review ?? record.showReview,
  };
}

function projectId(project: ProjectContainer) {
  return (
    stringField(recordField(project).id, "") || stringField(recordField(project).projectId, "")
  );
}

function projectCanManageIssueLabels(project: ProjectContainer) {
  const record = recordField(project);
  const permissions = recordField(record.permissions);
  const explicitFields = [
    record.viewerCanManageIssueLabels,
    record.viewerCanCreateIssueLabel,
    record.viewerCanUpdateIssueLabel,
    record.viewerCanDeleteIssueLabel,
    permissions.canManageIssueLabels,
    permissions.canCreateIssueLabel,
    permissions.canUpdateIssueLabel,
    permissions.canDeleteIssueLabel,
  ];
  if (explicitFields.some((value) => typeof value === "boolean")) {
    return explicitFields.some((value) => value === true);
  }
  return booleanField(record.viewerCanUpdate);
}

function recordField(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
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

function isLabelExists(labels: YoramRecord[], categoryName: string, labelName: string) {
  return labels.some(
    (label) =>
      stringField(label.category, "") === categoryName && stringField(label.name, "") === labelName,
  );
}

function refineHexColor(color: string) {
  const trimmed = color.trim();
  const shortHex = /^#([0-9a-f]{3})$/i.exec(trimmed);
  if (shortHex) {
    return `#${shortHex[1]
      .split("")
      .map((channel) => channel + channel)
      .join("")}`.toLowerCase();
  }
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  const rgb = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i.exec(trimmed);
  if (!rgb) {
    return "";
  }
  const channels = rgb.slice(1).map(Number);
  if (channels.some((channel) => channel < 0 || channel > 255)) {
    return "";
  }
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function colorInputStyle(color: string) {
  const refinedColor = refineHexColor(color);
  return refinedColor ? { boxShadow: `inset 25px 0 0 ${refinedColor}` } : undefined;
}

function contrastClass(color: string) {
  const refinedColor = refineHexColor(color);
  if (!refinedColor) {
    return "";
  }
  const red = Number.parseInt(refinedColor.slice(1, 3), 16);
  const green = Number.parseInt(refinedColor.slice(3, 5), 16);
  const blue = Number.parseInt(refinedColor.slice(5, 7), 16);
  return red * 0.299 + green * 0.587 + blue * 0.114 > 186 ? " dimgray" : " white";
}
