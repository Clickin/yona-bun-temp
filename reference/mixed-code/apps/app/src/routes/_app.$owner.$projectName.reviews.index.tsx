import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { ContentCard, ProjectShell, SidebarSection } from "@app/components/parity-shells";
import { buildProtectedRedirect } from "@app/lib/auth";
import { useTranslate } from "@app/lib/i18n-react";
import { listPullRequestReviewThreads, readPullRequestReviewCounts } from "@app/lib/pull-request";
import { readProjectDetail } from "@app/lib/project";

const optionalTrimmedStringSchema = z
  .string()
  .optional()
  .transform((value): string | undefined => {
    const trimmedValue = value?.trim();
    return trimmedValue ? trimmedValue : undefined;
  });

export const reviewRouteSearchSchema = z.object({
  authorLoginId: optionalTrimmedStringSchema,
  filter: optionalTrimmedStringSchema,
  orderBy: z.enum(["createdDate"]).catch("createdDate").default("createdDate"),
  orderDir: z.enum(["asc", "desc"]).catch("desc").default("desc"),
  participantLoginId: optionalTrimmedStringSchema,
  state: z.enum(["open", "closed"]).catch("open").default("open"),
});

type ReviewRouteSearch = z.infer<typeof reviewRouteSearchSchema>;

const emptyReviewCounts = {
  all: 0,
  closed: 0,
  createdByYou: 0,
  involvingYou: 0,
  open: 0,
} as const;

function normalizeReviewRouteSearch(input: Partial<ReviewRouteSearch>): ReviewRouteSearch {
  return reviewRouteSearchSchema.parse(input);
}

function buildReviewSearch(
  current: ReviewRouteSearch,
  overrides: Partial<ReviewRouteSearch>,
): ReviewRouteSearch {
  return normalizeReviewRouteSearch({
    ...current,
    ...overrides,
  });
}

function toReviewInput(params: { owner: string; projectName: string }, search: ReviewRouteSearch) {
  return {
    authorLoginId: search.authorLoginId,
    filter: search.filter,
    orderBy: search.orderBy,
    orderDir: search.orderDir,
    ownerName: params.owner,
    participantLoginId: search.participantLoginId,
    projectName: params.projectName,
    state: search.state,
  };
}

function formatAbsoluteDate(value: Date | null): string {
  return value ? value.toISOString().replace("T", " ").slice(0, 16) : "-";
}

function formatRelativeDate(value: Date | null): string {
  if (!value) {
    return "-";
  }

  const diffMs = Date.now() - value.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 1) {
    return "just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function toInitials(label: string): string {
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export const Route = createFileRoute("/_app/$owner/$projectName/reviews/")({
  validateSearch: reviewRouteSearchSchema,
  loaderDeps: ({ search }) => search,
  beforeLoad: async ({ context, location }) => {
    const redirectTarget = buildProtectedRedirect(
      await context.authCaller.readCurrentSession(),
      location.href,
    );
    if (redirectTarget) {
      throw redirect(redirectTarget);
    }
  },
  loader: async ({ context, deps, params }) => {
    const search = deps as ReviewRouteSearch;
    const projectRef = {
      ownerName: params.owner,
      projectName: params.projectName,
    };
    const session = await context.authCaller.readCurrentSession();
    if (session.isAnonymous || !session.loginId) {
      throw new Error("Authenticated session required.");
    }

    const project = await readProjectDetail({ data: projectRef });

    try {
      const input = toReviewInput(params, search);
      const [counts, threads] = await Promise.all([
        readPullRequestReviewCounts({ data: input }),
        listPullRequestReviewThreads({ data: input }),
      ]);

      return {
        counts,
        currentLoginId: session.loginId,
        errorMessage: null,
        project,
        search,
        threads,
      };
    } catch (error) {
      return {
        counts: emptyReviewCounts,
        currentLoginId: session.loginId,
        errorMessage: error instanceof Error ? error.message : "Review route failed.",
        project,
        search,
        threads: [],
      };
    }
  },
  component: ProjectReviewsIndexRouteComponent,
});

export const ProjectReviewsIndexRoute = Route;

function ProjectReviewsIndexRouteComponent() {
  const data = Route.useLoaderData();
  const params = Route.useParams();
  const search = Route.useSearch() as ReviewRouteSearch;
  const t = useTranslate();

  const allSearch = buildReviewSearch(search, {
    authorLoginId: undefined,
    participantLoginId: undefined,
  });
  const involvingYouSearch = buildReviewSearch(search, {
    authorLoginId: undefined,
    participantLoginId: data.currentLoginId,
  });
  const createdByYouSearch = buildReviewSearch(search, {
    authorLoginId: data.currentLoginId,
    participantLoginId: undefined,
  });
  const openSearch = buildReviewSearch(search, { state: "open" });
  const closedSearch = buildReviewSearch(search, { state: "closed" });
  const sortToggleSearch = buildReviewSearch(search, {
    orderBy: "createdDate",
    orderDir: search.orderDir === "desc" ? "asc" : "desc",
  });

  const allActive = !search.authorLoginId && !search.participantLoginId;
  const involvingYouActive =
    search.participantLoginId === data.currentLoginId && !search.authorLoginId;
  const createdByYouActive =
    search.authorLoginId === data.currentLoginId && !search.participantLoginId;

  return (
    <ProjectShell
      activeMenu="reviews"
      aside={
        <>
          <SidebarSection title={t("app.reviews.presets")}>
            <div className="sidebar-link-list">
              <Link
                className={allActive ? "sidebar-link entity-menu-link is-active" : "sidebar-link"}
                params={{ owner: params.owner, projectName: params.projectName }}
                search={allSearch}
                to="/$owner/$projectName/reviews"
              >
                {t("app.reviews.all")} <span className="badge">{data.counts.all}</span>
              </Link>
              <Link
                className={
                  involvingYouActive ? "sidebar-link entity-menu-link is-active" : "sidebar-link"
                }
                params={{ owner: params.owner, projectName: params.projectName }}
                search={involvingYouSearch}
                to="/$owner/$projectName/reviews"
              >
                {t("app.reviews.involvingYou")}{" "}
                <span className="badge">{data.counts.involvingYou}</span>
              </Link>
              <Link
                className={
                  createdByYouActive ? "sidebar-link entity-menu-link is-active" : "sidebar-link"
                }
                params={{ owner: params.owner, projectName: params.projectName }}
                search={createdByYouSearch}
                to="/$owner/$projectName/reviews"
              >
                {t("app.reviews.createdByYou")}{" "}
                <span className="badge">{data.counts.createdByYou}</span>
              </Link>
            </div>
          </SidebarSection>
          <SidebarSection title={t("app.reviews.filters")}>
            <form
              action={`/${params.owner}/${params.projectName}/reviews`}
              className="form-grid"
              method="get"
            >
              <input name="authorLoginId" type="hidden" value={search.authorLoginId ?? ""} />
              <input name="orderBy" type="hidden" value={search.orderBy} />
              <input name="orderDir" type="hidden" value={search.orderDir} />
              <input
                name="participantLoginId"
                type="hidden"
                value={search.participantLoginId ?? ""}
              />
              <input name="state" type="hidden" value={search.state} />
              <label className="field">
                <span>{t("app.reviews.filter")}</span>
                <input defaultValue={search.filter ?? ""} name="filter" type="text" />
              </label>
              <button className="cta" type="submit">
                {t("app.reviews.apply")}
              </button>
            </form>
            <Link
              className="sidebar-link"
              params={{ owner: params.owner, projectName: params.projectName }}
              search={sortToggleSearch}
              to="/$owner/$projectName/reviews"
            >
              {t("app.reviews.sortDate")}: {search.orderDir.toUpperCase()}
            </Link>
          </SidebarSection>
        </>
      }
      project={data.project}
    >
      <ContentCard title={t("app.reviews.title")}>
        <div className="link-row">
          <Link
            className={search.state === "open" ? "entity-menu-link is-active" : "entity-menu-link"}
            params={{ owner: params.owner, projectName: params.projectName }}
            search={openSearch}
            to="/$owner/$projectName/reviews"
          >
            OPEN <span className="badge">{data.counts.open}</span>
          </Link>
          <Link
            className={
              search.state === "closed" ? "entity-menu-link is-active" : "entity-menu-link"
            }
            params={{ owner: params.owner, projectName: params.projectName }}
            search={closedSearch}
            to="/$owner/$projectName/reviews"
          >
            CLOSED <span className="badge">{data.counts.closed}</span>
          </Link>
        </div>
        {data.errorMessage ? <p className="note error-note">{data.errorMessage}</p> : null}
      </ContentCard>
      <ContentCard title={t("app.reviews.list")}>
        {data.threads.length === 0 ? (
          <p className="note">{t("app.reviews.empty")}</p>
        ) : (
          data.threads.map((thread) => (
            <section className="sidebar-card" key={thread.threadId}>
              <div className="page-title-row">
                <div>
                  <p className="page-eyebrow">#{thread.threadId}</p>
                  <h2>{thread.text}</h2>
                </div>
                <div className="profile-avatar">{toInitials(thread.authorName)}</div>
              </div>
              <div className="badge-row">
                <span className="badge">{t("app.project.stateBadge", thread.state)}</span>
                <span className="badge">{t("app.reviews.replyCount", thread.replyCount)}</span>
              </div>
              <p className="note">{thread.authorName}</p>
              {thread.path ? <p className="note">{thread.path}</p> : null}
              <p className="note" title={formatAbsoluteDate(thread.createdAt)}>
                {formatRelativeDate(thread.createdAt)}
              </p>
            </section>
          ))
        )}
      </ContentCard>
    </ProjectShell>
  );
}
