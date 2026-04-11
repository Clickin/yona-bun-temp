import {
  milestoneCreateInputSchema,
  milestoneDeleteInputSchema,
  milestoneRefSchema,
  milestoneSchema,
  milestoneUpdateInputSchema,
  projectRefSchema,
  type Milestone,
  type MilestoneCreateInput,
  type MilestoneDeleteInput,
  type MilestoneRef,
  type MilestoneUpdateInput,
  type ProjectRef,
} from "@yona/contracts";
import {
  createMilestoneRecord,
  deleteMilestoneRecord,
  listMilestonesByProject,
  readMilestoneByProjectAndId,
  readProjectAuthorization,
  updateMilestoneRecord,
} from "@yona/db";
import { DomainNotFoundError, type DomainActor } from "./errors";
import {
  requireProjectReadAuthorization,
  requireProjectWriteAuthorization,
} from "./project-authorization";

export interface MilestoneServiceDeps {
  createMilestoneRecord: typeof createMilestoneRecord;
  deleteMilestoneRecord: typeof deleteMilestoneRecord;
  listMilestonesByProject: typeof listMilestonesByProject;
  readMilestoneByProjectAndId: typeof readMilestoneByProjectAndId;
  readProjectAuthorization: typeof readProjectAuthorization;
  updateMilestoneRecord: typeof updateMilestoneRecord;
}

const defaultDeps: MilestoneServiceDeps = {
  createMilestoneRecord,
  deleteMilestoneRecord,
  listMilestonesByProject,
  readMilestoneByProjectAndId,
  readProjectAuthorization,
  updateMilestoneRecord,
};

export async function listMilestones(
  actor: DomainActor,
  input: ProjectRef,
  deps: MilestoneServiceDeps = defaultDeps,
): Promise<Milestone[]> {
  const parsedInput = projectRefSchema.parse(input);
  const authorization = await requireProjectReadAuthorization(actor, parsedInput, deps);
  return milestoneSchema
    .array()
    .parse(
      await deps.listMilestonesByProject(
        authorization.project.id,
        authorization.project.ownerName,
        authorization.project.projectName,
      ),
    );
}

export async function readMilestoneDetail(
  actor: DomainActor,
  input: MilestoneRef,
  deps: MilestoneServiceDeps = defaultDeps,
): Promise<Milestone> {
  const parsedInput = milestoneRefSchema.parse(input);
  const authorization = await requireProjectReadAuthorization(actor, parsedInput, deps);

  const milestone = await deps.readMilestoneByProjectAndId(
    authorization.project.id,
    parsedInput.milestoneId,
    authorization.project.ownerName,
    authorization.project.projectName,
  );
  if (!milestone) {
    throw new DomainNotFoundError("Milestone not found.");
  }

  return milestoneSchema.parse(milestone);
}

export async function createMilestone(
  actor: DomainActor,
  input: MilestoneCreateInput,
  deps: MilestoneServiceDeps = defaultDeps,
): Promise<Milestone> {
  const parsedInput = milestoneCreateInputSchema.parse(input);
  const authorization = await requireProjectWriteAuthorization(actor, parsedInput, deps);
  const milestoneId = await deps.createMilestoneRecord({
    contents: parsedInput.contents,
    dueDate: parsedInput.dueDate,
    projectId: authorization.project.id,
    state: parsedInput.state,
    title: parsedInput.title,
  });

  const created = await deps.readMilestoneByProjectAndId(
    authorization.project.id,
    milestoneId,
    authorization.project.ownerName,
    authorization.project.projectName,
  );
  if (!created) {
    throw new DomainNotFoundError("Milestone not found.");
  }

  return milestoneSchema.parse(created);
}

export async function updateMilestone(
  actor: DomainActor,
  input: MilestoneUpdateInput,
  deps: MilestoneServiceDeps = defaultDeps,
): Promise<Milestone> {
  const parsedInput = milestoneUpdateInputSchema.parse(input);
  const authorization = await requireProjectWriteAuthorization(actor, parsedInput, deps);

  const existing = await deps.readMilestoneByProjectAndId(
    authorization.project.id,
    parsedInput.milestoneId,
    authorization.project.ownerName,
    authorization.project.projectName,
  );
  if (!existing) {
    throw new DomainNotFoundError("Milestone not found.");
  }

  await deps.updateMilestoneRecord({
    contents: parsedInput.contents,
    dueDate: parsedInput.dueDate,
    milestoneId: parsedInput.milestoneId,
    projectId: authorization.project.id,
    state: parsedInput.state,
    title: parsedInput.title,
  });

  const updated = await deps.readMilestoneByProjectAndId(
    authorization.project.id,
    parsedInput.milestoneId,
    authorization.project.ownerName,
    authorization.project.projectName,
  );
  if (!updated) {
    throw new DomainNotFoundError("Milestone not found.");
  }

  return milestoneSchema.parse(updated);
}

export async function deleteMilestone(
  actor: DomainActor,
  input: MilestoneDeleteInput,
  deps: MilestoneServiceDeps = defaultDeps,
): Promise<void> {
  const parsedInput = milestoneDeleteInputSchema.parse(input);
  const authorization = await requireProjectWriteAuthorization(actor, parsedInput, deps);

  const existing = await deps.readMilestoneByProjectAndId(
    authorization.project.id,
    parsedInput.milestoneId,
    authorization.project.ownerName,
    authorization.project.projectName,
  );
  if (!existing) {
    throw new DomainNotFoundError("Milestone not found.");
  }

  await deps.deleteMilestoneRecord(authorization.project.id, parsedInput.milestoneId);
}
