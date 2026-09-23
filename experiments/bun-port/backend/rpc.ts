import { initTRPC, TRPCError } from "@trpc/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import superjson from "superjson";
import { z } from "zod";
import {
  AuthError,
  clearedSessionCookies,
  isCsrfValid,
  readSession,
  sessionCookies,
  signIn,
  signOut,
} from "./auth";
import { createIssue, IssueError, listIssues, readIssue, updateIssue } from "./issues";

export interface RpcContext {
  readonly request: Request;
  readonly userId: string | null;
  readonly projectId: string | null;
  readonly csrfToken: string | null;
  readonly responseHeaders: Headers;
}

const t = initTRPC.context<RpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      message: error.code === "INTERNAL_SERVER_ERROR" ? "Internal server error" : shape.message,
      data: {
        code: shape.data.code,
        httpStatus: shape.data.httpStatus,
        path: shape.data.path,
      },
    };
  },
});

function requireUser(context: RpcContext): { userId: string; projectId: string } {
  if (!context.userId || !context.projectId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Login required" });
  }
  return { userId: context.userId, projectId: context.projectId };
}

function requireCsrf(context: RpcContext): void {
  if (!context.csrfToken || !isCsrfValid(context.request, context.csrfToken)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Invalid CSRF token" });
  }
}

function translate(error: unknown): never {
  if (error instanceof IssueError) {
    throw new TRPCError({ code: error.code, message: error.message, cause: error });
  }
  throw error;
}

function translateAuth(error: unknown): never {
  if (error instanceof AuthError) {
    const code =
      error.code === "LOGIN_REQUIRED"
        ? "BAD_REQUEST"
        : error.code === "USER_DELETED"
          ? "NOT_FOUND"
          : "FORBIDDEN";
    throw new TRPCError({ code, message: error.message, cause: error });
  }
  throw error;
}

function requireSameOrigin(request: Request): void {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Invalid request origin" });
  }
}

const issueId = z.bigint().refine((id) => id > 0n && id < 1n << 128n);
const projectId = z.string().trim().min(1).max(80);
const title = z.string().trim().min(1).max(120);

export const appRouter = t.router({
  auth: t.router({
    session: t.procedure.query(({ ctx }) => {
      ctx.responseHeaders.set("Cache-Control", "private, no-store");
      return ctx.userId && ctx.projectId
        ? { authenticated: true, userId: ctx.userId, projectId: ctx.projectId }
        : { authenticated: false };
    }),
    signIn: t.procedure
      .input(
        z.object({
          identifier: z.string().trim().min(1).max(200),
          password: z.string().min(1).max(256),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        requireSameOrigin(ctx.request);
        try {
          const { session, sessionToken } = await signIn(input.identifier, input.password);
          ctx.responseHeaders.set("Cache-Control", "private, no-store");
          for (const cookie of sessionCookies(ctx.request, sessionToken, session.csrfToken)) {
            ctx.responseHeaders.append("Set-Cookie", cookie);
          }
          return { authenticated: true, userId: session.userId, projectId: session.projectId };
        } catch (error) {
          return translateAuth(error);
        }
      }),
    signOut: t.procedure.mutation(async ({ ctx }) => {
      requireSameOrigin(ctx.request);
      requireCsrf(ctx);
      await signOut(ctx.request);
      ctx.responseHeaders.set("Cache-Control", "private, no-store");
      for (const cookie of clearedSessionCookies(ctx.request))
        ctx.responseHeaders.append("Set-Cookie", cookie);
      return { authenticated: false };
    }),
  }),
  runtime: t.router({
    info: t.procedure.query(() => ({ version: Bun.version, revision: Bun.revision })),
  }),
  viewer: t.procedure.query(({ ctx }) => {
    const user = requireUser(ctx);
    return { userId: user.userId, projectId: user.projectId };
  }),
  issue: t.router({
    homeList: t.procedure.query(async ({ ctx }) => {
      const user = requireUser(ctx);
      try {
        const items = await listIssues(user.userId, user.projectId);
        return { viewer: user, items };
      } catch (error) {
        return translate(error);
      }
    }),
    list: t.procedure
      .input(z.object({ projectId, state: z.enum(["open", "closed", "all"]).default("open") }))
      .query(async ({ ctx, input }) => {
        const user = requireUser(ctx);
        try {
          return await listIssues(user.userId, input.projectId, input.state);
        } catch (error) {
          return translate(error);
        }
      }),
    read: t.procedure.input(z.object({ projectId, id: issueId })).query(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      try {
        return await readIssue(user.userId, input.projectId, input.id);
      } catch (error) {
        return translate(error);
      }
    }),
    create: t.procedure
      .input(z.object({ projectId, title, body: z.string().max(20_000).nullable().optional() }))
      .mutation(async ({ ctx, input }) => {
        requireCsrf(ctx);
        const user = requireUser(ctx);
        try {
          return await createIssue(user.userId, input.projectId, input.title, input.body ?? null);
        } catch (error) {
          return translate(error);
        }
      }),
    update: t.procedure
      .input(
        z
          .object({
            projectId,
            id: issueId,
            title: title.optional(),
            body: z.string().max(20_000).nullable().optional(),
          })
          .refine((input) => input.title !== undefined || input.body !== undefined, {
            message: "At least one issue field is required",
          }),
      )
      .mutation(async ({ ctx, input }) => {
        requireCsrf(ctx);
        const user = requireUser(ctx);
        try {
          return await updateIssue(user.userId, input.projectId, input.id, {
            title: input.title,
            body: input.body,
          });
        } catch (error) {
          return translate(error);
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;

export async function createRpcContext(
  request: Request,
  responseHeaders = new Headers(),
): Promise<RpcContext> {
  const session = await readSession(request);
  return {
    request,
    responseHeaders,
    userId: session?.userId ?? null,
    projectId: session?.projectId ?? null,
    csrfToken: session?.csrfToken ?? null,
  };
}

export async function handleTrpcRequest(request: Request): Promise<Response> {
  const boundedRequest = await limitRequestBody(request);
  if (!boundedRequest) return new Response("Payload Too Large", { status: 413 });
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: boundedRequest,
    router: appRouter,
    createContext: ({ req, resHeaders }) => createRpcContext(req, resHeaders),
  });
}

async function limitRequestBody(request: Request): Promise<Request | null> {
  if (!request.body) return request;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > 8192) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body,
    signal: request.signal,
  });
}
