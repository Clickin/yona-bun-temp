import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import {
  bootstrapRepositoryInputSchema,
  bootstrapRepositoryOutputSchema,
  createRepositoryCommitDiscussionCommentInputSchema,
  createRepositoryCommitDiscussionCommentOutputSchema,
  deleteRepositoryCommitDiscussionCommentInputSchema,
  deleteRepositoryCommitDiscussionCommentOutputSchema,
  inlineEditRepositoryInputSchema,
  inlineEditRepositoryOutputSchema,
  listRepositoryCommitDiscussionThreadsInputSchema,
  listRepositoryCommitDiscussionThreadsOutputSchema,
  listRepositoryBranchesInputSchema,
  listRepositoryBranchesOutputSchema,
  listRepositoryCommitsInputSchema,
  listRepositoryCommitsOutputSchema,
  readRepositoryCommitInputSchema,
  readRepositoryCommitOutputSchema,
  readRepositoryFileInputSchema,
  readRepositoryFileOutputSchema,
  updateRepositoryCommitDiscussionThreadStateInputSchema,
  updateRepositoryCommitDiscussionThreadStateOutputSchema,
} from "@yona/contracts";
import { loadRepositoryAccessFacts } from "@yona/db";
import {
  authorizeRepositoryAccess,
  createRepositoryCommitDiscussionComment,
  deleteRepositoryCommitDiscussionComment,
  DomainConflictError,
  DomainNotFoundError,
  DomainPermissionError,
  DomainValidationError,
  listRepositoryCommitDiscussionThreads,
  type DomainActor,
  type RepositoryPermission,
  updateRepositoryCommitDiscussionThreadState,
} from "@yona/domain";
import {
  AuthorizationError,
  ConflictError,
  createMutationActor,
  ensureYonaDataDirectories,
  GitCommandError,
  getRepositoryRoot,
  performInlineEditMutation,
  runGit,
  provisionRepository,
  readRepositoryFile,
  resolveRepositoryPath,
} from "@yona/vcs";
import type { ResolvedRequestPrincipal } from "@yona/auth";

export interface RepoProcedureContext {
  principal: ResolvedRequestPrincipal;
  requestId?: string;
}

const t = initTRPC.context<RepoProcedureContext>().create({
  transformer: superjson,
});

function throwRepositoryAuthError(principal: ResolvedRequestPrincipal): never {
  throw new TRPCError({
    code: principal.isAuthenticated ? "FORBIDDEN" : "UNAUTHORIZED",
  });
}

function createRepoDomainActor(principal: ResolvedRequestPrincipal): DomainActor {
  return {
    actorId: principal.user?.id ?? null,
    isAnonymous: !principal.isAuthenticated,
    isSiteAdmin: principal.user?.isSiteAdmin ?? false,
    loginId: principal.user?.loginId ?? null,
    name: principal.user?.name ?? null,
  };
}

function rethrowDomainAsTrpc(error: unknown): never {
  if (error instanceof DomainConflictError) {
    throw new TRPCError({
      code: "CONFLICT",
      message: error.message,
    });
  }

  if (error instanceof DomainNotFoundError) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: error.message,
    });
  }

  if (error instanceof DomainPermissionError) {
    throw new TRPCError({
      code: error.requiresAuthentication ? "UNAUTHORIZED" : "FORBIDDEN",
      message: error.message,
    });
  }

  if (error instanceof DomainValidationError) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: error.message,
    });
  }

  throw error;
}

export async function authorizeRepositoryRequest(
  principal: ResolvedRequestPrincipal,
  repoId: string,
  permission: RepositoryPermission,
) {
  const facts = await loadRepositoryAccessFacts(repoId, principal.user?.id ?? null);
  if (!facts) {
    throw new TRPCError({
      code: "NOT_FOUND",
    });
  }

  const decision = authorizeRepositoryAccess(facts, permission);
  if (!decision.allowed) {
    throwRepositoryAuthError(principal);
  }

  return {
    decision,
    facts,
  };
}

function createRepositoryMutationActor(
  principal: ResolvedRequestPrincipal,
  permission: RepositoryPermission,
) {
  if (!principal.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
    });
  }

  const isAdmin = permission === "admin";

  return createMutationActor({
    canAdmin: isAdmin,
    canDirectWrite: permission === "write" || permission === "admin",
    email: principal.user.emailAddress,
    id: String(principal.user.id),
    ipAddress: principal.ipAddress,
    name: principal.user.name,
    role: isAdmin ? "admin" : "maintainer",
  });
}

function parseIsoDate(value: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Invalid git timestamp format.",
    });
  }
  return parsed;
}

function parseTabSeparatedRows(output: string): string[][] {
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.split("\t"));
}

async function ensureRepositoryCommitExists(
  principal: ResolvedRequestPrincipal,
  repoId: string,
  oid: string,
) {
  const { facts } = await authorizeRepositoryRequest(principal, repoId, "read");
  if (!facts.isGitRepository) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Commit not found.",
    });
  }

  await ensureYonaDataDirectories();
  const repoPath = resolveRepositoryPath(getRepositoryRoot(), repoId);

  try {
    await runGit(["rev-parse", "--verify", `${oid}^{commit}`], {
      cwd: repoPath,
    });
  } catch (error) {
    if (error instanceof GitCommandError) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Commit not found.",
      });
    }

    throw error;
  }
}

export const repoRouter = t.router({
  bootstrapRepository: t.procedure
    .input(bootstrapRepositoryInputSchema)
    .output(bootstrapRepositoryOutputSchema)
    .mutation(async ({ ctx, input }) => {
      await authorizeRepositoryRequest(ctx.principal, input.repoId, "admin");
      return bootstrapRepositoryOutputSchema.parse(await provisionRepository(input.repoId));
    }),
  createRepositoryCommitDiscussionComment: t.procedure
    .input(createRepositoryCommitDiscussionCommentInputSchema)
    .output(createRepositoryCommitDiscussionCommentOutputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        await ensureRepositoryCommitExists(ctx.principal, input.repoId, input.oid);
        return createRepositoryCommitDiscussionCommentOutputSchema.parse(
          await createRepositoryCommitDiscussionComment(
            createRepoDomainActor(ctx.principal),
            input,
          ),
        );
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
  deleteRepositoryCommitDiscussionComment: t.procedure
    .input(deleteRepositoryCommitDiscussionCommentInputSchema)
    .output(deleteRepositoryCommitDiscussionCommentOutputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        await ensureRepositoryCommitExists(ctx.principal, input.repoId, input.oid);
        return deleteRepositoryCommitDiscussionCommentOutputSchema.parse(
          await deleteRepositoryCommitDiscussionComment(
            createRepoDomainActor(ctx.principal),
            input,
          ),
        );
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
  inlineEditRepository: t.procedure
    .input(inlineEditRepositoryInputSchema)
    .output(inlineEditRepositoryOutputSchema)
    .mutation(async ({ ctx, input }) => {
      await authorizeRepositoryRequest(ctx.principal, input.repoId, "write");
      await ensureYonaDataDirectories();

      try {
        const repoPath = resolveRepositoryPath(getRepositoryRoot(), input.repoId);
        const result = await performInlineEditMutation({
          actor: createRepositoryMutationActor(ctx.principal, "write"),
          baseOid: input.baseOid,
          branch: input.branch,
          content: input.content,
          filePath: input.filePath,
          message: input.message,
          repoPath,
          repositoryId: input.repoId,
          requestId: ctx.requestId,
        });

        return inlineEditRepositoryOutputSchema.parse({
          branch: input.branch,
          commit: result.commit,
          filePath: input.filePath,
          repositoryId: input.repoId,
          requestId: result.requestId,
        });
      } catch (error) {
        if (error instanceof AuthorizationError) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: error.message,
          });
        }

        if (error instanceof ConflictError) {
          throw new TRPCError({
            code: "CONFLICT",
            message: error.message,
          });
        }

        throw error;
      }
    }),
  readRepositoryFileContent: t.procedure
    .input(readRepositoryFileInputSchema)
    .output(readRepositoryFileOutputSchema)
    .query(async ({ ctx, input }) => {
      await authorizeRepositoryRequest(ctx.principal, input.repoId, "read");
      await ensureYonaDataDirectories();

      const repoPath = resolveRepositoryPath(getRepositoryRoot(), input.repoId);
      const result = await readRepositoryFile({
        branch: input.branch,
        filePath: input.filePath,
        repoPath,
      });

      return readRepositoryFileOutputSchema.parse({
        baseOid: result.oid,
        branch: input.branch,
        content: result.content,
        filePath: input.filePath,
        repositoryId: input.repoId,
      });
    }),
  listRepositoryBranches: t.procedure
    .input(listRepositoryBranchesInputSchema)
    .output(listRepositoryBranchesOutputSchema)
    .query(async ({ ctx, input }) => {
      await authorizeRepositoryRequest(ctx.principal, input.repoId, "read");
      await ensureYonaDataDirectories();
      const repoPath = resolveRepositoryPath(getRepositoryRoot(), input.repoId);

      try {
        const result = await runGit(
          ["for-each-ref", "--format=%(refname:short)\t%(objectname)\t%(HEAD)", "refs/heads"],
          { cwd: repoPath },
        );
        return listRepositoryBranchesOutputSchema.parse(
          parseTabSeparatedRows(result.stdout).map((parts) => ({
            isHead: (parts[2] ?? "").trim() === "*",
            name: parts[0] ?? "",
            oid: parts[1] ?? "",
          })),
        );
      } catch (error) {
        if (error instanceof GitCommandError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Repository branches could not be loaded.",
          });
        }
        throw error;
      }
    }),
  listRepositoryCommitDiscussionThreads: t.procedure
    .input(listRepositoryCommitDiscussionThreadsInputSchema)
    .output(listRepositoryCommitDiscussionThreadsOutputSchema)
    .query(async ({ ctx, input }) => {
      try {
        await ensureRepositoryCommitExists(ctx.principal, input.repoId, input.oid);
        return listRepositoryCommitDiscussionThreadsOutputSchema.parse(
          await listRepositoryCommitDiscussionThreads(createRepoDomainActor(ctx.principal), input),
        );
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
  listRepositoryCommits: t.procedure
    .input(listRepositoryCommitsInputSchema)
    .output(listRepositoryCommitsOutputSchema)
    .query(async ({ ctx, input }) => {
      await authorizeRepositoryRequest(ctx.principal, input.repoId, "read");
      await ensureYonaDataDirectories();
      const repoPath = resolveRepositoryPath(getRepositoryRoot(), input.repoId);

      try {
        const result = await runGit(
          ["log", `--max-count=${input.limit}`, "--format=%H\t%h\t%s\t%an\t%aI", input.branch],
          { cwd: repoPath },
        );
        return listRepositoryCommitsOutputSchema.parse(
          parseTabSeparatedRows(result.stdout).map((parts) => ({
            authorName: parts[3] ?? "",
            authoredAt: parseIsoDate(parts[4] ?? ""),
            oid: parts[0] ?? "",
            shortOid: parts[1] ?? "",
            subject: parts[2] ?? "",
          })),
        );
      } catch (error) {
        if (error instanceof GitCommandError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Repository commits could not be loaded.",
          });
        }
        throw error;
      }
    }),
  readRepositoryCommitDetail: t.procedure
    .input(readRepositoryCommitInputSchema)
    .output(readRepositoryCommitOutputSchema)
    .query(async ({ ctx, input }) => {
      await authorizeRepositoryRequest(ctx.principal, input.repoId, "read");
      await ensureYonaDataDirectories();
      const repoPath = resolveRepositoryPath(getRepositoryRoot(), input.repoId);

      try {
        const metadata = await runGit(
          ["show", "-s", "--format=%H\t%h\t%s\t%an\t%ae\t%aI", input.oid],
          {
            cwd: repoPath,
          },
        );
        const body = await runGit(["show", "-s", "--format=%b", input.oid], {
          cwd: repoPath,
        });
        const [parts] = parseTabSeparatedRows(metadata.stdout);
        if (!parts) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Commit not found.",
          });
        }

        return readRepositoryCommitOutputSchema.parse({
          authorEmail: parts[4] ?? "",
          authorName: parts[3] ?? "",
          authoredAt: parseIsoDate(parts[5] ?? ""),
          body: body.stdout.trimEnd(),
          oid: parts[0] ?? "",
          shortOid: parts[1] ?? "",
          subject: parts[2] ?? "",
        });
      } catch (error) {
        if (error instanceof GitCommandError) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Commit not found.",
          });
        }
        throw error;
      }
    }),
  updateRepositoryCommitDiscussionThreadState: t.procedure
    .input(updateRepositoryCommitDiscussionThreadStateInputSchema)
    .output(updateRepositoryCommitDiscussionThreadStateOutputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        await ensureRepositoryCommitExists(ctx.principal, input.repoId, input.oid);
        return updateRepositoryCommitDiscussionThreadStateOutputSchema.parse(
          await updateRepositoryCommitDiscussionThreadState(
            createRepoDomainActor(ctx.principal),
            input,
          ),
        );
      } catch (error) {
        return rethrowDomainAsTrpc(error);
      }
    }),
});

export function createRepoCaller(context: RepoProcedureContext) {
  return repoRouter.createCaller(context);
}
