import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import {
  codeTagsQueryOptions,
  createCodeTag,
  deleteCodeTag,
  type CodeTagItem,
  type CodeTagListResponse,
} from "../../../api/code";
import { apiQueryKeys } from "../../../api/query-keys";
import { readSessionBootstrap } from "../../../auth-workspace-client";
import { useLegacyMessages } from "../../../i18n";
import type { RuntimeConfig } from "../../../runtime-config";
import { projectTagsTheme } from "./-tags.stylex";

export const Route = createFileRoute("/$ownerName/$projectName/tags")({
  component: ProjectTagsRoute,
});

function ProjectTagsRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  return <ProjectTagsScreen runtimeConfig={runtimeConfig} />;
}

function ProjectTagsScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const { t } = useLegacyMessages();
  const tagsQuery = useQuery(codeTagsQueryOptions(runtimeConfig, { ownerName, projectName }));

  if (!tagsQuery.data) {
    return null;
  }

  const titleText = `${t("project.tags") || "Tags"} - ${ownerName}/${projectName}`;

  return (
    <>
      <title>{titleText}</title>
      <ProjectTagsBody tagsData={tagsQuery.data} runtimeConfig={runtimeConfig} />
    </>
  );
}

function ProjectTagsBody({
  runtimeConfig,
  tagsData,
}: {
  runtimeConfig: RuntimeConfig;
  tagsData: CodeTagListResponse;
}) {
  const { t } = useLegacyMessages();
  const { ownerName, projectName } = Route.useParams();
  const [showCreateForm, setShowCreateForm] = useState(false);

  return (
    <div className="page-wrap-outer">
      <div className="project-page-wrap">
        <div className="bubble-wrap dark-gray repo-wrap">
          <div className="code-browse-wrap">
            <ul
              className={`${stylex.props(styles.tagTabs).className} nav nav-tabs`}
              data-stylex-owner="project-tags-tabs"
            >
              <li>
                <Link
                  to="/$ownerName/$projectName/code/$branch"
                  params={{ branch: "HEAD", ownerName, projectName }}
                  activeOptions={{
                    exact: true,
                    explicitUndefined: true,
                    includeHash: true,
                    includeSearch: true,
                  }}
                  activeProps={{
                    "aria-current": undefined,
                    className: undefined,
                    "data-status": undefined,
                  }}
                >
                  {t("code.files")}
                </Link>
              </li>
              <li>
                <Link
                  to="/$ownerName/$projectName/commits/$branch"
                  params={{ branch: "HEAD", ownerName, projectName }}
                  search={{}}
                  activeOptions={{
                    exact: true,
                    explicitUndefined: true,
                    includeHash: true,
                    includeSearch: true,
                  }}
                  activeProps={{
                    "aria-current": undefined,
                    className: undefined,
                    "data-status": undefined,
                  }}
                >
                  {t("code.commits")}
                </Link>
              </li>
              <li>
                <Link
                  to="/$ownerName/$projectName/branches"
                  params={{ ownerName, projectName }}
                  activeOptions={{
                    exact: true,
                    explicitUndefined: true,
                    includeHash: true,
                    includeSearch: true,
                  }}
                  activeProps={{
                    "aria-current": undefined,
                    className: undefined,
                    "data-status": undefined,
                  }}
                >
                  {t("title.branches")}
                </Link>
              </li>
              <li className="active">
                <Link
                  to="/$ownerName/$projectName/tags"
                  params={{ ownerName, projectName }}
                  hash="tags-active-sentinel"
                  activeOptions={{
                    exact: true,
                    explicitUndefined: true,
                    includeHash: true,
                    includeSearch: true,
                  }}
                  activeProps={{
                    "aria-current": undefined,
                    className: undefined,
                    "data-status": undefined,
                  }}
                >
                  {t("project.tags") || "Tags"}
                </Link>
              </li>
            </ul>

            <div className={stylex.props(styles.headerActionRow).className}>
              <h3 className={stylex.props(styles.sectionTitle).className}>
                {t("project.tags") || "Tags"} ({tagsData.tags.length})
              </h3>
              {tagsData.permissions.canCreate ? (
                <button
                  type="button"
                  className="ybtn ybtn-success ybtn-small"
                  onClick={() => setShowCreateForm((prev) => !prev)}
                >
                  {showCreateForm
                    ? t("button.cancel") || "Cancel"
                    : t("code.tags.create") || "New Tag"}
                </button>
              ) : null}
            </div>

            {showCreateForm && tagsData.permissions.canCreate ? (
              <CreateTagForm
                runtimeConfig={runtimeConfig}
                onCreated={() => setShowCreateForm(false)}
              />
            ) : null}

            <table
              className={`${stylex.props(styles.tagTable).className} table tag-list-wrap`}
              data-stylex-owner="project-tags-table"
            >
              <thead
                className={`${stylex.props(styles.tableHead).className} thead`}
                data-stylex-owner="project-tags-table-head"
              >
                <tr>
                  <th className={stylex.props(styles.tableCell).className}>
                    {t("code.tags.name") || "Tag Name"}
                  </th>
                  <th className={stylex.props(styles.tableCell).className}>
                    {t("code.branches.commit") || "Commit"}
                  </th>
                  <th className={stylex.props(styles.tableCell).className}>
                    {t("code.tags.author") || "Author / Date"}
                  </th>
                  <th className={stylex.props(styles.tableCell).className}>
                    {t("code.tags.message") || "Message"}
                  </th>
                  {tagsData.permissions.canDelete ? (
                    <th className={stylex.props(styles.tableCell).className}></th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {tagsData.tags.length === 0 ? (
                  <tr>
                    <td
                      colSpan={tagsData.permissions.canDelete ? 5 : 4}
                      className={stylex.props(styles.emptyCell).className}
                    >
                      {t("code.tags.empty") || "No tags found in repository."}
                    </td>
                  </tr>
                ) : (
                  tagsData.tags.map((tag) => (
                    <TagRow
                      key={tag.name}
                      tag={tag}
                      tagsData={tagsData}
                      runtimeConfig={runtimeConfig}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateTagForm({
  onCreated,
  runtimeConfig,
}: {
  onCreated: () => void;
  runtimeConfig: RuntimeConfig;
}) {
  const { t } = useLegacyMessages();
  const { ownerName, projectName } = Route.useParams();
  const queryClient = useQueryClient();
  const [tagName, setTagName] = useState("");
  const [target, setTarget] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const queryKey = [...apiQueryKeys.project.base(ownerName, projectName), "tags"] as const;

  const createMutation = useMutation({
    mutationFn: async () => {
      setError(null);
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return createCodeTag(runtimeConfig, csrfToken, {
        message: message.trim() || undefined,
        ownerName,
        projectName,
        tagName: tagName.trim(),
        target: target.trim() || undefined,
      });
    },
    onError(err: Error) {
      setError(err.message || "Failed to create tag");
    },
    onSuccess(data) {
      queryClient.setQueryData(queryKey, data);
      onCreated();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagName.trim()) {
      setError("Tag name is required");
      return;
    }
    createMutation.mutate();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={stylex.props(styles.createForm).className}
      data-stylex-owner="project-tags-create-form"
    >
      <h4 className={stylex.props(styles.formTitle).className}>
        {t("code.tags.createNew") || "Create New Tag"}
      </h4>
      {error ? <div className={stylex.props(styles.errorMsg).className}>{error}</div> : null}
      <div className={stylex.props(styles.formRow).className}>
        <div className={stylex.props(styles.formGroup).className}>
          <label htmlFor="tag-name-input" className={stylex.props(styles.label).className}>
            {t("code.tags.name") || "Tag Name"} *
          </label>
          <input
            id="tag-name-input"
            type="text"
            className="text"
            placeholder="e.g. v1.0.0"
            value={tagName}
            onChange={(e) => setTagName(e.target.value)}
          />
        </div>
        <div className={stylex.props(styles.formGroup).className}>
          <label htmlFor="tag-target-input" className={stylex.props(styles.label).className}>
            {t("code.tags.target") || "Target Branch/Commit"}
          </label>
          <input
            id="tag-target-input"
            type="text"
            className="text"
            placeholder="HEAD"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
        </div>
      </div>
      <div className={stylex.props(styles.formGroupFull).className}>
        <label htmlFor="tag-message-input" className={stylex.props(styles.label).className}>
          {t("code.tags.message") || "Tag Annotation / Message"}
        </label>
        <textarea
          id="tag-message-input"
          className="text"
          rows={2}
          placeholder="Optional release notes or annotation"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>
      <div className={stylex.props(styles.formActions).className}>
        <button
          type="submit"
          className="ybtn ybtn-success ybtn-small"
          disabled={createMutation.isPending}
        >
          {createMutation.isPending
            ? t("button.saving") || "Saving..."
            : t("button.save") || "Create Tag"}
        </button>
      </div>
    </form>
  );
}

function TagRow({
  runtimeConfig,
  tag,
  tagsData,
}: {
  runtimeConfig: RuntimeConfig;
  tag: CodeTagItem;
  tagsData: CodeTagListResponse;
}) {
  const { t } = useLegacyMessages();
  const { ownerName, projectName } = Route.useParams();
  const queryClient = useQueryClient();
  const queryKey = [...apiQueryKeys.project.base(ownerName, projectName), "tags"] as const;

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return deleteCodeTag(runtimeConfig, csrfToken, {
        ownerName,
        projectName,
        tagName: tag.name,
      });
    },
    onSuccess(data) {
      queryClient.setQueryData(queryKey, data);
    },
  });

  return (
    <tr className={stylex.props(styles.tagRow).className} data-stylex-owner="project-tags-row">
      <td
        className={`${stylex.props(styles.tableCell, styles.tagNameCell).className} tagName`}
        data-stylex-owner="project-tags-name-cell"
      >
        <Link
          to="/$ownerName/$projectName/code/$branch"
          params={{ branch: tag.name, ownerName, projectName }}
          className={stylex.props(styles.tagLink).className}
          data-stylex-owner="project-tags-tag-link"
        >
          {tag.shortName || tag.name}
        </Link>
      </td>
      <td
        className={`${stylex.props(styles.tableCell, styles.commitCell).className} commit`}
        data-stylex-owner="project-tags-commit-cell"
      >
        <Link
          to="/$ownerName/$projectName/commit/$commitId"
          params={{ commitId: tag.commitId, ownerName, projectName }}
          search={{ branch: tag.name, path: "" }}
          className={stylex.props(styles.commitId).className}
          data-stylex-owner="project-tags-commit-link"
          title={tag.commitId}
        >
          {tag.commitShortId || tag.commitId.slice(0, 7)}
        </Link>
      </td>
      <td
        className={`${stylex.props(styles.tableCell, styles.creatorCell).className} creator`}
        data-stylex-owner="project-tags-creator-cell"
      >
        <span className={stylex.props(styles.creatorName).className}>
          {tag.creatorName || tag.creatorEmail}
        </span>
        {tag.createdDate ? (
          <span className={stylex.props(styles.createdDate).className}>{tag.createdDate}</span>
        ) : null}
      </td>
      <td
        className={`${stylex.props(styles.tableCell, styles.messageCell).className} message`}
        data-stylex-owner="project-tags-message-cell"
      >
        <span className={stylex.props(styles.commitMessage).className}>{tag.commitMessage}</span>
      </td>
      {tagsData.permissions.canDelete ? (
        <td
          className={`${stylex.props(styles.tableCell, styles.actionsCell).className} actions`}
          data-stylex-owner="project-tags-actions-cell"
        >
          <button
            type="button"
            className="ybtn ybtn-danger ybtn-small"
            disabled={deleteMutation.isPending}
            onClick={(event) => {
              event.preventDefault();
              deleteMutation.mutate();
            }}
          >
            {t("button.delete")}
          </button>
        </td>
      ) : null}
    </tr>
  );
}

const styles = stylex.create({
  actionsCell: {
    minWidth: "90px",
    textAlign: "right",
    width: "90px",
  },
  commitCell: {
    paddingTop: "13px",
    width: "120px",
  },
  commitId: {
    color: projectTagsTheme.commitIdText,
    fontFamily: "monospace",
  },
  commitMessage: {
    color: "#444444",
    fontSize: "12px",
  },
  createForm: {
    backgroundColor: projectTagsTheme.formBg,
    borderColor: projectTagsTheme.formBorder,
    borderRadius: "4px",
    borderStyle: "solid",
    borderWidth: "1px",
    marginBottom: "20px",
    padding: "16px",
  },
  createdDate: {
    color: projectTagsTheme.commitDateText,
    fontSize: "11px",
    marginLeft: "8px",
  },
  creatorCell: {
    paddingTop: "13px",
    width: "200px",
  },
  creatorName: {
    color: projectTagsTheme.creatorText,
    fontWeight: "500",
  },
  emptyCell: {
    color: projectTagsTheme.mutedText,
    padding: "24px",
    textAlign: "center",
  },
  errorMsg: {
    color: "#d9534f",
    fontSize: "12px",
    marginBottom: "10px",
  },
  formActions: {
    marginTop: "12px",
    textAlign: "right",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
  },
  formGroupFull: {
    display: "flex",
    flexDirection: "column",
    marginTop: "10px",
  },
  formRow: {
    display: "flex",
    gap: "12px",
  },
  formTitle: {
    fontSize: "14px",
    fontWeight: "bold",
    marginBottom: "12px",
  },
  headerActionRow: {
    alignItems: "center",
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "16px",
  },
  label: {
    fontSize: "12px",
    fontWeight: "600",
    marginBottom: "4px",
  },
  messageCell: {
    paddingTop: "13px",
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: "bold",
    margin: 0,
  },
  tableCell: {
    border: "none",
    verticalAlign: "top",
  },
  tableHead: {
    backgroundColor: projectTagsTheme.headerBackground,
    borderBottomColor: projectTagsTheme.headerBorder,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
    fontSize: "12px",
    lineHeight: "34px",
  },
  tagLink: {
    color: projectTagsTheme.tagLink,
    fontFamily: "monospace",
    fontWeight: "bold",
  },
  tagNameCell: {
    minWidth: "160px",
    paddingTop: "13px",
  },
  tagRow: {
    borderBottomColor: projectTagsTheme.rowBorder,
    borderBottomStyle: "solid",
    borderBottomWidth: "1px",
  },
  tagTable: {
    width: "100%",
  },
  tagTabs: {
    marginBottom: "20px",
  },
});
