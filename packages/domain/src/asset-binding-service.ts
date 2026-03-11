import {
  finalizeUploadSessionInputSchema,
  finalizeUploadSessionOutputSchema,
  type FinalizeUploadSessionInput,
  type FinalizeUploadSessionOutput,
} from "@yona/contracts";
import {
  canManageProjectUploadTarget,
  finalizeTemporaryUploadRecord,
  readTemporaryUploadRecord,
  resolveUploadBindingProjectId,
} from "@yona/db";
import { requireAuthenticatedActor } from "./actor-utils";
import { DomainNotFoundError, DomainPermissionError, type DomainActor } from "./errors";

export async function finalizeUploadSession(
  actor: DomainActor,
  input: FinalizeUploadSessionInput,
): Promise<FinalizeUploadSessionOutput> {
  requireAuthenticatedActor(actor);
  const parsedInput = finalizeUploadSessionInputSchema.parse(input);
  const assetId = Number.parseInt(parsedInput.uploadId, 10);
  if (!Number.isInteger(assetId) || assetId <= 0) {
    throw new DomainNotFoundError("Upload session not found.");
  }

  const upload = await readTemporaryUploadRecord(assetId);
  if (!upload) {
    throw new DomainNotFoundError("Upload session not found.");
  }

  if (upload.containerType !== "user" || upload.containerId !== actor.actorId) {
    throw new DomainPermissionError("Only the uploader can finalize this upload.");
  }

  if (parsedInput.resourceType === "user" || parsedInput.resourceType === "user_avatar") {
    if (parsedInput.resourceId !== actor.actorId) {
      throw new DomainPermissionError("User asset binding requires ownership.");
    }
  }

  const projectId = await resolveUploadBindingProjectId({
    resourceId: parsedInput.resourceId,
    resourceType: parsedInput.resourceType,
  });
  if (projectId !== null && !actor.isSiteAdmin) {
    const canManage = await canManageProjectUploadTarget({
      actorId: actor.actorId,
      projectId,
    });
    if (!canManage) {
      throw new DomainPermissionError("Project upload target update is not allowed.");
    }
  }

  const finalized = await finalizeTemporaryUploadRecord({
    assetId,
    expectedOwnerUserId: actor.actorId,
    resourceId: parsedInput.resourceId,
    resourceType: parsedInput.resourceType,
  });

  return finalizeUploadSessionOutputSchema.parse({
    assetId: finalized.assetId,
    containerId: finalized.containerId,
    containerType: parsedInput.resourceType,
    uploadId: parsedInput.uploadId,
  });
}
