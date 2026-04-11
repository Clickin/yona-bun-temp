import { createUploadSessionOutputSchema, type CreateUploadSessionOutput } from "@yona/contracts";
import { createTemporaryUploadRecord } from "@yona/db";
import { requireAuthenticatedActor } from "./actor-utils";
import type { DomainActor } from "./errors";

export async function createUploadSession(
  actor: DomainActor,
  input: {
    fileName: string;
    hash: string;
    mimeType: null | string;
    size: number;
  },
): Promise<CreateUploadSessionOutput> {
  requireAuthenticatedActor(actor);

  const created = await createTemporaryUploadRecord({
    fileName: input.fileName,
    hash: input.hash,
    mimeType: input.mimeType,
    ownerLoginId: actor.loginId,
    ownerUserId: actor.actorId,
    size: input.size,
  });

  return createUploadSessionOutputSchema.parse({
    assetId: created.assetId,
    fileName: input.fileName,
    hash: created.hash,
    mimeType: input.mimeType,
    ownerLoginId: actor.loginId,
    size: input.size,
    uploadId: String(created.assetId),
  });
}
