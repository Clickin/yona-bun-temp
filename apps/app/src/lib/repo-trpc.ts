import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import {
  bootstrapRepositoryInputSchema,
  bootstrapRepositoryOutputSchema,
  inlineEditRepositoryInputSchema,
  inlineEditRepositoryOutputSchema,
  readRepositoryFileInputSchema,
  readRepositoryFileOutputSchema,
} from "@yona/contracts";
import { loadRepositoryAccessFacts } from "@yona/db";
import { authorizeRepositoryAccess, type RepositoryPermission } from "@yona/domain";
import {
  AuthorizationError,
  ConflictError,
  createMutationActor,
  ensureYonaDataDirectories,
  getRepositoryRoot,
  performInlineEditMutation,
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

export const repoRouter = t.router({
  bootstrapRepository: t.procedure
    .input(bootstrapRepositoryInputSchema)
    .output(bootstrapRepositoryOutputSchema)
    .mutation(async ({ ctx, input }) => {
      await authorizeRepositoryRequest(ctx.principal, input.repoId, "admin");
      return bootstrapRepositoryOutputSchema.parse(await provisionRepository(input.repoId));
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
});

export function createRepoCaller(context: RepoProcedureContext) {
  return repoRouter.createCaller(context);
}
