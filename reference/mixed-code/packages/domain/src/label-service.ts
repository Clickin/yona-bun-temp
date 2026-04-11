import {
  issueLabelCreateInputSchema,
  issueLabelDeleteInputSchema,
  issueLabelSchema,
  issueLabelUpdateInputSchema,
  labelCategoryCreateInputSchema,
  labelCategoryDeleteInputSchema,
  labelCategorySchema,
  labelCategoryUpdateInputSchema,
  projectRefSchema,
  type IssueLabel,
  type IssueLabelCreateInput,
  type IssueLabelDeleteInput,
  type IssueLabelUpdateInput,
  type LabelCategory,
  type LabelCategoryCreateInput,
  type LabelCategoryDeleteInput,
  type LabelCategoryUpdateInput,
  type ProjectRef,
} from "@yona/contracts";
import {
  createIssueLabelRecord,
  createLabelCategoryRecord,
  deleteIssueLabelRecord,
  deleteLabelCategoryRecord,
  listIssueLabelsByProject,
  listLabelCategoriesByProject,
  readIssueLabelByProjectAndId,
  readLabelCategoryByProjectAndId,
  readProjectAuthorization,
  updateIssueLabelRecord,
  updateLabelCategoryRecord,
} from "@yona/db";
import { DomainNotFoundError, type DomainActor } from "./errors";
import {
  requireProjectReadAuthorization,
  requireProjectWriteAuthorization,
} from "./project-authorization";

export interface LabelServiceDeps {
  createIssueLabelRecord: typeof createIssueLabelRecord;
  createLabelCategoryRecord: typeof createLabelCategoryRecord;
  deleteIssueLabelRecord: typeof deleteIssueLabelRecord;
  deleteLabelCategoryRecord: typeof deleteLabelCategoryRecord;
  listIssueLabelsByProject: typeof listIssueLabelsByProject;
  listLabelCategoriesByProject: typeof listLabelCategoriesByProject;
  readIssueLabelByProjectAndId: typeof readIssueLabelByProjectAndId;
  readLabelCategoryByProjectAndId: typeof readLabelCategoryByProjectAndId;
  readProjectAuthorization: typeof readProjectAuthorization;
  updateIssueLabelRecord: typeof updateIssueLabelRecord;
  updateLabelCategoryRecord: typeof updateLabelCategoryRecord;
}

const defaultDeps: LabelServiceDeps = {
  createIssueLabelRecord,
  createLabelCategoryRecord,
  deleteIssueLabelRecord,
  deleteLabelCategoryRecord,
  listIssueLabelsByProject,
  listLabelCategoriesByProject,
  readIssueLabelByProjectAndId,
  readLabelCategoryByProjectAndId,
  readProjectAuthorization,
  updateIssueLabelRecord,
  updateLabelCategoryRecord,
};

export async function listLabelCategories(
  actor: DomainActor,
  input: ProjectRef,
  deps: LabelServiceDeps = defaultDeps,
): Promise<LabelCategory[]> {
  const parsedInput = projectRefSchema.parse(input);
  const authorization = await requireProjectReadAuthorization(actor, parsedInput, deps);
  return labelCategorySchema
    .array()
    .parse(
      await deps.listLabelCategoriesByProject(
        authorization.project.id,
        authorization.project.ownerName,
        authorization.project.projectName,
      ),
    );
}

export async function createLabelCategory(
  actor: DomainActor,
  input: LabelCategoryCreateInput,
  deps: LabelServiceDeps = defaultDeps,
): Promise<LabelCategory> {
  const parsedInput = labelCategoryCreateInputSchema.parse(input);
  const authorization = await requireProjectWriteAuthorization(actor, parsedInput, deps);
  const categoryId = await deps.createLabelCategoryRecord({
    isExclusive: parsedInput.isExclusive,
    name: parsedInput.name,
    projectId: authorization.project.id,
  });

  const created = await deps.readLabelCategoryByProjectAndId(
    authorization.project.id,
    categoryId,
    authorization.project.ownerName,
    authorization.project.projectName,
  );
  if (!created) {
    throw new DomainNotFoundError("Label category not found.");
  }

  return labelCategorySchema.parse(created);
}

export async function updateLabelCategory(
  actor: DomainActor,
  input: LabelCategoryUpdateInput,
  deps: LabelServiceDeps = defaultDeps,
): Promise<LabelCategory> {
  const parsedInput = labelCategoryUpdateInputSchema.parse(input);
  const authorization = await requireProjectWriteAuthorization(actor, parsedInput, deps);

  const existing = await deps.readLabelCategoryByProjectAndId(
    authorization.project.id,
    parsedInput.categoryId,
    authorization.project.ownerName,
    authorization.project.projectName,
  );
  if (!existing) {
    throw new DomainNotFoundError("Label category not found.");
  }

  await deps.updateLabelCategoryRecord({
    categoryId: parsedInput.categoryId,
    isExclusive: parsedInput.isExclusive,
    name: parsedInput.name,
    projectId: authorization.project.id,
  });

  const updated = await deps.readLabelCategoryByProjectAndId(
    authorization.project.id,
    parsedInput.categoryId,
    authorization.project.ownerName,
    authorization.project.projectName,
  );
  if (!updated) {
    throw new DomainNotFoundError("Label category not found.");
  }

  return labelCategorySchema.parse(updated);
}

export async function deleteLabelCategory(
  actor: DomainActor,
  input: LabelCategoryDeleteInput,
  deps: LabelServiceDeps = defaultDeps,
): Promise<void> {
  const parsedInput = labelCategoryDeleteInputSchema.parse(input);
  const authorization = await requireProjectWriteAuthorization(actor, parsedInput, deps);

  const existing = await deps.readLabelCategoryByProjectAndId(
    authorization.project.id,
    parsedInput.categoryId,
    authorization.project.ownerName,
    authorization.project.projectName,
  );
  if (!existing) {
    throw new DomainNotFoundError("Label category not found.");
  }

  await deps.deleteLabelCategoryRecord(authorization.project.id, parsedInput.categoryId);
}

export async function listIssueLabels(
  actor: DomainActor,
  input: ProjectRef,
  deps: LabelServiceDeps = defaultDeps,
): Promise<IssueLabel[]> {
  const parsedInput = projectRefSchema.parse(input);
  const authorization = await requireProjectReadAuthorization(actor, parsedInput, deps);
  return issueLabelSchema
    .array()
    .parse(
      await deps.listIssueLabelsByProject(
        authorization.project.id,
        authorization.project.ownerName,
        authorization.project.projectName,
      ),
    );
}

export async function createIssueLabel(
  actor: DomainActor,
  input: IssueLabelCreateInput,
  deps: LabelServiceDeps = defaultDeps,
): Promise<IssueLabel> {
  const parsedInput = issueLabelCreateInputSchema.parse(input);
  const authorization = await requireProjectWriteAuthorization(actor, parsedInput, deps);

  const category = await deps.readLabelCategoryByProjectAndId(
    authorization.project.id,
    parsedInput.categoryId,
    authorization.project.ownerName,
    authorization.project.projectName,
  );
  if (!category) {
    throw new DomainNotFoundError("Label category not found.");
  }

  const labelId = await deps.createIssueLabelRecord({
    categoryId: parsedInput.categoryId,
    color: parsedInput.color,
    name: parsedInput.name,
    projectId: authorization.project.id,
  });

  const created = await deps.readIssueLabelByProjectAndId(
    authorization.project.id,
    labelId,
    authorization.project.ownerName,
    authorization.project.projectName,
  );
  if (!created) {
    throw new DomainNotFoundError("Issue label not found.");
  }

  return issueLabelSchema.parse(created);
}

export async function updateIssueLabel(
  actor: DomainActor,
  input: IssueLabelUpdateInput,
  deps: LabelServiceDeps = defaultDeps,
): Promise<IssueLabel> {
  const parsedInput = issueLabelUpdateInputSchema.parse(input);
  const authorization = await requireProjectWriteAuthorization(actor, parsedInput, deps);

  const existing = await deps.readIssueLabelByProjectAndId(
    authorization.project.id,
    parsedInput.labelId,
    authorization.project.ownerName,
    authorization.project.projectName,
  );
  if (!existing) {
    throw new DomainNotFoundError("Issue label not found.");
  }

  const category = await deps.readLabelCategoryByProjectAndId(
    authorization.project.id,
    parsedInput.categoryId,
    authorization.project.ownerName,
    authorization.project.projectName,
  );
  if (!category) {
    throw new DomainNotFoundError("Label category not found.");
  }

  await deps.updateIssueLabelRecord({
    categoryId: parsedInput.categoryId,
    color: parsedInput.color,
    labelId: parsedInput.labelId,
    name: parsedInput.name,
    projectId: authorization.project.id,
  });

  const updated = await deps.readIssueLabelByProjectAndId(
    authorization.project.id,
    parsedInput.labelId,
    authorization.project.ownerName,
    authorization.project.projectName,
  );
  if (!updated) {
    throw new DomainNotFoundError("Issue label not found.");
  }

  return issueLabelSchema.parse(updated);
}

export async function deleteIssueLabel(
  actor: DomainActor,
  input: IssueLabelDeleteInput,
  deps: LabelServiceDeps = defaultDeps,
): Promise<void> {
  const parsedInput = issueLabelDeleteInputSchema.parse(input);
  const authorization = await requireProjectWriteAuthorization(actor, parsedInput, deps);

  const existing = await deps.readIssueLabelByProjectAndId(
    authorization.project.id,
    parsedInput.labelId,
    authorization.project.ownerName,
    authorization.project.projectName,
  );
  if (!existing) {
    throw new DomainNotFoundError("Issue label not found.");
  }

  await deps.deleteIssueLabelRecord(authorization.project.id, parsedInput.labelId);
}
