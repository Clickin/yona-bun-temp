import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
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
            <ul className="nav nav-tabs" data-owner="project-tags-tabs">
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

            <div className="s2e-tags-header-action-row">
              <h3 className="s2e-tags-section-title">
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

            <table className="table tag-list-wrap" data-owner="project-tags-table">
              <thead className="thead" data-owner="project-tags-table-head">
                <tr>
                  <th className="s2e-tags-table-cell">{t("code.tags.name") || "Tag Name"}</th>
                  <th className="s2e-tags-table-cell">{t("code.branches.commit") || "Commit"}</th>
                  <th className="s2e-tags-table-cell">
                    {t("code.tags.author") || "Author / Date"}
                  </th>
                  <th className="s2e-tags-table-cell">{t("code.tags.message") || "Message"}</th>
                  {tagsData.permissions.canDelete ? (
                    <th className="s2e-tags-table-cell"></th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {tagsData.tags.length === 0 ? (
                  <tr>
                    <td
                      colSpan={tagsData.permissions.canDelete ? 5 : 4}
                      className="s2e-tags-empty-cell"
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
    <form onSubmit={handleSubmit} className="" data-owner="project-tags-create-form">
      <h4 className="s2e-tags-form-title">{t("code.tags.createNew") || "Create New Tag"}</h4>
      {error ? <div className="s2e-tags-error-msg">{error}</div> : null}
      <div className="s2e-tags-form-row">
        <div className="s2e-tags-form-group">
          <label htmlFor="tag-name-input" className="s2e-tags-label">
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
        <div className="s2e-tags-form-group">
          <label htmlFor="tag-target-input" className="s2e-tags-label">
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
      <div className="s2e-tags-form-group-full">
        <label htmlFor="tag-message-input" className="s2e-tags-label">
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
      <div className="s2e-tags-form-actions">
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
    <tr className="" data-owner="project-tags-row">
      <td className="tagName" data-owner="project-tags-name-cell">
        <Link
          to="/$ownerName/$projectName/code/$branch"
          params={{ branch: tag.name, ownerName, projectName }}
          className="s2e-tags-tag-link"
          data-owner="project-tags-tag-link"
        >
          {tag.shortName || tag.name}
        </Link>
      </td>
      <td className="commit" data-owner="project-tags-commit-cell">
        <Link
          to="/$ownerName/$projectName/commit/$commitId"
          params={{ commitId: tag.commitId, ownerName, projectName }}
          search={{ branch: tag.name, path: "" }}
          className="s2e-tags-commit-id"
          data-owner="project-tags-commit-link"
          title={tag.commitId}
        >
          {tag.commitShortId || tag.commitId.slice(0, 7)}
        </Link>
      </td>
      <td className="creator" data-owner="project-tags-creator-cell">
        <span className="s2e-tags-creator-name">{tag.creatorName || tag.creatorEmail}</span>
        {tag.createdDate ? <span className="s2e-tags-created-date">{tag.createdDate}</span> : null}
      </td>
      <td className="message" data-owner="project-tags-message-cell">
        <span className="s2e-tags-commit-message">{tag.commitMessage}</span>
      </td>
      {tagsData.permissions.canDelete ? (
        <td className="actions" data-owner="project-tags-actions-cell">
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
