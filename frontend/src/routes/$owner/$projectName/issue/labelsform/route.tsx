import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
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
import { ProjectMenu } from "../../../../-project-views";
import type { ProjectDetailViewModel } from "../../../../-view-models";
import {
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

function IssueLabelsFormRouteComponent() {
  const { owner, projectName } = Route.useParams();
  const { bootstrapping, csrfToken, runtimeConfig, setErrorMessage } = useAppRuntime();
  const routeHref = `/${owner}/${projectName}/issue/labelsform`;
  const [detail, setDetail] = React.useState<ReturnType<typeof toProjectContainerView> | null>(
    null,
  );
  const [labels, setLabels] = React.useState<LabelView[]>([]);
  const [categories, setCategories] = React.useState<CategoryView[]>([]);
  const [failureKind, setFailureKind] = React.useState<null | "forbidden" | "not-found">(null);

  useDocumentTitle("Issue Labels");

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
        setErrorMessage(error instanceof Error ? error.message : "Read issue labels failed.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload, setErrorMessage]);

  if (bootstrapping) {
    return (
      <main className="app-shell">
        <h1>Loading...</h1>
      </main>
    );
  }
  if (failureKind === "forbidden") {
    return <ForbiddenPage href={routeHref} />;
  }
  if (failureKind === "not-found") {
    return <NotFoundPage href={routeHref} />;
  }

  return (
    <IssueLabelsFormPage
      categories={categories}
      csrfToken={csrfToken}
      detail={detail}
      labels={labels}
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

function IssueLabelsFormPage(props: {
  categories: CategoryView[];
  csrfToken: string;
  detail: ProjectDetailViewModel | null;
  labels: LabelView[];
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
  return (
    <main className="app-shell label-editor-wrap">
      <p className="eyebrow">Yona Rust Project</p>
      <h1>Issue Labels</h1>
      <ProjectMenu detail={detail} runtimeConfig={props.runtimeConfig} />
      <section className="new-label-wrap">
        <strong className="form-legend">Add new label</strong>
        <IssueLabelCreateForm {...props} />
      </section>
      <section id="labelsList" className="issue-label-list-wrap">
        {props.labels.length === 0 ? (
          <div className="error-wrap">
            <p>No label exists</p>
          </div>
        ) : (
          <>
            <div className="row-fluid list-head">
              <strong>Category</strong>
              <strong>Name</strong>
            </div>
            {grouped.map((group) => (
              <div
                className="row-fluid list-item category-wrap"
                data-category={group.categoryId}
                key={group.categoryId}
              >
                <h5>
                  <span className="category-name">{group.categoryName}</span>
                  <span>
                    {group.categoryIsExclusive ? "only a single label" : "multiple labels"}
                  </span>
                  <IssueCategoryEditForm category={group} {...props} />
                </h5>
                <table className="table nm">
                  <tbody>
                    {group.labels.map((label) => (
                      <tr data-label-id={label.id} key={label.id}>
                        <td>
                          <span
                            className="issue-label active"
                            style={{ backgroundColor: label.color }}
                          >
                            {label.name}
                          </span>
                        </td>
                        <td className="actions">
                          <IssueLabelEditForm label={label} {...props} />
                          <button
                            className="ybtn ybtn-danger ybtn-small"
                            onClick={() =>
                              void deleteProjectLabel(props.runtimeConfig, props.csrfToken, {
                                labelId: BigInt(label.id),
                                ownerName: props.owner,
                                projectName: props.projectName,
                              }).then(props.onChanged)
                            }
                            type="button"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </>
        )}
      </section>
    </main>
  );
}

function IssueLabelCreateForm(props: {
  csrfToken: string;
  onChanged: () => Promise<void>;
  owner: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
}) {
  const [categoryName, setCategoryName] = React.useState("");
  const [labelName, setLabelName] = React.useState("");
  const [labelColor, setLabelColor] = React.useState("#f44336");
  return (
    <form
      id="frmNewLabel"
      onSubmit={(event) => {
        event.preventDefault();
        void createProjectLabel(props.runtimeConfig, props.csrfToken, {
          categoryName,
          labelColor,
          labelName,
          ownerName: props.owner,
          projectName: props.projectName,
        }).then(props.onChanged);
      }}
    >
      <input
        maxLength={250}
        name="category"
        onChange={(event) => setCategoryName(event.currentTarget.value)}
        placeholder="Category"
        value={categoryName}
      />
      <input
        maxLength={250}
        name="name"
        onChange={(event) => setLabelName(event.currentTarget.value)}
        placeholder="Name"
        value={labelName}
      />
      <input
        name="color"
        onChange={(event) => setLabelColor(event.currentTarget.value)}
        placeholder="Label Color"
        value={labelColor}
      />
      <button className="ybtn ybtn-primary btn-submit" type="submit">
        Add label
      </button>
    </form>
  );
}

function IssueLabelEditForm(props: {
  categories: CategoryView[];
  csrfToken: string;
  label: LabelView;
  onChanged: () => Promise<void>;
  owner: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
}) {
  const [editing, setEditing] = React.useState(false);
  const [categoryId, setCategoryId] = React.useState(props.label.categoryId);
  const [labelName, setLabelName] = React.useState(props.label.name);
  const [labelColor, setLabelColor] = React.useState(props.label.color);
  if (!editing) {
    return (
      <button className="ybtn ybtn-small" onClick={() => setEditing(true)} type="button">
        Edit
      </button>
    );
  }
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void updateProjectLabel(props.runtimeConfig, props.csrfToken, {
          categoryId: BigInt(categoryId),
          labelColor,
          labelId: BigInt(props.label.id),
          labelName,
          ownerName: props.owner,
          projectName: props.projectName,
        }).then(async () => {
          setEditing(false);
          await props.onChanged();
        });
      }}
    >
      <select
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
        maxLength={250}
        onChange={(event) => setLabelName(event.currentTarget.value)}
        value={labelName}
      />
      <input onChange={(event) => setLabelColor(event.currentTarget.value)} value={labelColor} />
      <button type="submit">Save</button>
      <button onClick={() => setEditing(false)} type="button">
        Cancel
      </button>
    </form>
  );
}

function IssueCategoryEditForm(props: {
  category: LabelGroup;
  csrfToken: string;
  onChanged: () => Promise<void>;
  owner: string;
  projectName: string;
  runtimeConfig: RuntimeConfig;
}) {
  const [editing, setEditing] = React.useState(false);
  const [categoryName, setCategoryName] = React.useState(props.category.categoryName);
  const [isExclusive, setIsExclusive] = React.useState(props.category.categoryIsExclusive);
  if (!editing) {
    return (
      <button className="ybtn ybtn-mini" onClick={() => setEditing(true)} type="button">
        Edit category
      </button>
    );
  }
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void updateProjectLabelCategory(props.runtimeConfig, props.csrfToken, {
          categoryId: BigInt(props.category.categoryId),
          categoryIsExclusive: isExclusive,
          categoryName,
          ownerName: props.owner,
          projectName: props.projectName,
        }).then(async () => {
          setEditing(false);
          await props.onChanged();
        });
      }}
    >
      <input
        onChange={(event) => setCategoryName(event.currentTarget.value)}
        value={categoryName}
      />
      <select
        onChange={(event) => setIsExclusive(event.currentTarget.value === "true")}
        value={String(isExclusive)}
      >
        <option value="false">multiple labels</option>
        <option value="true">only a single label</option>
      </select>
      <button type="submit">Save</button>
      <button onClick={() => setEditing(false)} type="button">
        Cancel
      </button>
      <button
        onClick={() =>
          void deleteProjectLabelCategory(props.runtimeConfig, props.csrfToken, {
            categoryId: BigInt(props.category.categoryId),
            ownerName: props.owner,
            projectName: props.projectName,
          }).then(props.onChanged)
        }
        type="button"
      >
        Delete
      </button>
    </form>
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
  return [...groups.values()].sort((left, right) =>
    left.categoryName.localeCompare(right.categoryName),
  );
}
