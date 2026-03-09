import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import {
  createBasicAuthChallengeResponse,
  createRateLimitedTextResponse,
  resolveServerRequestPrincipal,
} from "@app/lib/server-request-auth";
import {
  loadAttachmentAssetRecord,
  loadAttachmentProjectMembershipFacts,
  type AttachmentAssetRecord,
} from "@yona/db";
import { authorizeAssetRead, type AssetReadAuthorizationDecision } from "@yona/domain";
import { getYonaDataRoot } from "@yona/vcs";

export type AssetDisposition = "attachment" | "inline";

function createAssetBlobPath(hash: string): string {
  return join(getYonaDataRoot(), "uploads", hash);
}

function createAssetEtag(hash: string, disposition: AssetDisposition): string {
  return `"${hash}-${disposition}"`;
}

function matchesIfNoneMatch(request: Request, eTag: string): boolean {
  const value = request.headers.get("if-none-match");
  if (!value) {
    return false;
  }

  return value.split(",").some((candidate) => {
    const normalized = candidate.trim();
    return normalized === "*" || normalized === eTag;
  });
}

function sanitizeFilename(fileName: string): string {
  return fileName.replace(/[\r\n"]/g, "_");
}

function createContentDisposition(disposition: AssetDisposition, fileName: string): string {
  return `${disposition}; filename="${sanitizeFilename(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

function createAssetHeaders(input: {
  disposition: AssetDisposition;
  eTag: string;
  fileName: string;
  mimeType: null | string;
  size: null | number;
}): Headers {
  const headers = new Headers({
    "Cache-Control": "private, max-age=3600",
    "Content-Disposition": createContentDisposition(input.disposition, input.fileName),
    "Content-Type": input.mimeType ?? "application/octet-stream",
    ETag: input.eTag,
    Vary: "Authorization, Cookie",
  });

  if (input.size !== null) {
    headers.set("Content-Length", String(input.size));
  }

  return headers;
}

function createNotFoundResponse(): Response {
  return new Response("The file does not exist.", { status: 404 });
}

function createAssetAuthResponse(reason: AssetReadAuthorizationDecision["reason"]): Response {
  if (reason === "authentication-required") {
    return createBasicAuthChallengeResponse();
  }

  return new Response("Forbidden", { status: 403 });
}

async function authorizeAssetRequest(
  record: AttachmentAssetRecord,
  request: Request,
): Promise<Response | null> {
  const principal = await resolveServerRequestPrincipal(request);
  if (principal.isRateLimited) {
    return createRateLimitedTextResponse(principal.retryAfterSeconds ?? 60);
  }

  if (principal.hasInvalidCredentials) {
    return createBasicAuthChallengeResponse();
  }

  const viewer = {
    isSiteAdmin: Boolean(principal.user?.isSiteAdmin),
    userId: principal.user?.id ?? null,
  };

  const decision =
    record.binding.kind === "project"
      ? authorizeAssetRead({
          binding: record.binding,
          projectFacts: await loadAttachmentProjectMembershipFacts(record.binding, viewer.userId),
          viewer,
        })
      : authorizeAssetRead({
          binding: record.binding,
          viewer,
        });

  if (!decision.allowed) {
    return createAssetAuthResponse(decision.reason);
  }

  return null;
}

export async function handleAssetRequest(input: {
  assetId: string;
  disposition: AssetDisposition;
  request: Request;
}): Promise<Response> {
  const record = await loadAttachmentAssetRecord(input.assetId);
  if (!record) {
    return createNotFoundResponse();
  }

  const authResponse = await authorizeAssetRequest(record, input.request);
  if (authResponse) {
    return authResponse;
  }

  const blobPath = createAssetBlobPath(record.hash);
  let fileStat;

  try {
    fileStat = await stat(blobPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return createNotFoundResponse();
    }

    return new Response("Failed to load asset.", { status: 500 });
  }

  const eTag = createAssetEtag(record.hash, input.disposition);
  const headers = createAssetHeaders({
    disposition: input.disposition,
    eTag,
    fileName: record.fileName,
    mimeType: record.mimeType,
    size: record.size ?? Number(fileStat.size),
  });

  if (matchesIfNoneMatch(input.request, eTag)) {
    return new Response(null, {
      headers,
      status: 304,
    });
  }

  const body = Readable.toWeb(createReadStream(blobPath)) as ReadableStream<Uint8Array>;
  return new Response(body, {
    headers,
    status: 200,
  });
}
