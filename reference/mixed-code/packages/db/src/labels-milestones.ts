import { and, asc, eq } from "drizzle-orm";
import type { IssueLabel, LabelCategory, Milestone, MilestoneState } from "@yona/contracts";
import { getDb, type DatabaseType } from "./index";
import { getDbSchema } from "./runtime-schema";

function normalizeNullableDate(value: Date | null | string): Date | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeNullableText(value: null | string): null | string {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 || trimmed.toUpperCase() === "NULL" ? null : trimmed;
}

function milestoneStateFromRaw(value: null | number): MilestoneState {
  return value === 1 ? "closed" : "open";
}

function milestoneStateToRaw(value: MilestoneState): number {
  return value === "open" ? 0 : 1;
}

export async function listLabelCategoriesByProject(
  projectId: number,
  ownerName: string,
  projectName: string,
  db: DatabaseType = getDb(),
): Promise<LabelCategory[]> {
  const schema = getDbSchema(db);
  const rows = await (db as any)
    .select({
      categoryId: schema.issueLabelCategory.id,
      isExclusive: schema.issueLabelCategory.isExclusive,
      name: schema.issueLabelCategory.name,
    })
    .from(schema.issueLabelCategory)
    .where(eq(schema.issueLabelCategory.projectId, projectId))
    .orderBy(asc(schema.issueLabelCategory.name), asc(schema.issueLabelCategory.id));

  return rows
    .map((row: any) => {
      const name = normalizeNullableText(row.name);
      if (!name || !Number.isInteger(row.categoryId) || row.categoryId <= 0) {
        return null;
      }

      return {
        categoryId: row.categoryId,
        isExclusive: Boolean(row.isExclusive),
        name,
        ownerName,
        projectName,
      } satisfies LabelCategory;
    })
    .filter((row: LabelCategory | null): row is LabelCategory => row !== null);
}

export async function readLabelCategoryByProjectAndId(
  projectId: number,
  categoryId: number,
  ownerName: string,
  projectName: string,
  db: DatabaseType = getDb(),
): Promise<LabelCategory | null> {
  const schema = getDbSchema(db);
  const [row] = await (db as any)
    .select({
      categoryId: schema.issueLabelCategory.id,
      isExclusive: schema.issueLabelCategory.isExclusive,
      name: schema.issueLabelCategory.name,
    })
    .from(schema.issueLabelCategory)
    .where(
      and(
        eq(schema.issueLabelCategory.projectId, projectId),
        eq(schema.issueLabelCategory.id, categoryId),
      ),
    )
    .limit(1);

  if (!row) {
    return null;
  }

  const name = normalizeNullableText(row.name);
  if (!name || !Number.isInteger(row.categoryId) || row.categoryId <= 0) {
    return null;
  }

  return {
    categoryId: row.categoryId,
    isExclusive: Boolean(row.isExclusive),
    name,
    ownerName,
    projectName,
  } satisfies LabelCategory;
}

export async function createLabelCategoryRecord(
  input: {
    isExclusive: boolean;
    name: string;
    projectId: number;
  },
  db: DatabaseType = getDb(),
): Promise<number> {
  const schema = getDbSchema(db);
  const [inserted] = await (db as any)
    .insert(schema.issueLabelCategory)
    .values({
      isExclusive: input.isExclusive,
      name: input.name,
      projectId: input.projectId,
    })
    .returning({
      categoryId: schema.issueLabelCategory.id,
    });

  if (!inserted || !Number.isInteger(inserted.categoryId) || inserted.categoryId <= 0) {
    throw new Error("Failed to create label category record.");
  }

  return inserted.categoryId;
}

export async function updateLabelCategoryRecord(
  input: {
    categoryId: number;
    isExclusive: boolean;
    name: string;
    projectId: number;
  },
  db: DatabaseType = getDb(),
): Promise<void> {
  const schema = getDbSchema(db);
  await (db as any)
    .update(schema.issueLabelCategory)
    .set({
      isExclusive: input.isExclusive,
      name: input.name,
    })
    .where(
      and(
        eq(schema.issueLabelCategory.projectId, input.projectId),
        eq(schema.issueLabelCategory.id, input.categoryId),
      ),
    );
}

export async function deleteLabelCategoryRecord(
  projectId: number,
  categoryId: number,
  db: DatabaseType = getDb(),
): Promise<void> {
  const schema = getDbSchema(db);
  await (db as any)
    .delete(schema.issueLabelCategory)
    .where(
      and(
        eq(schema.issueLabelCategory.projectId, projectId),
        eq(schema.issueLabelCategory.id, categoryId),
      ),
    );
}

export async function listIssueLabelsByProject(
  projectId: number,
  ownerName: string,
  projectName: string,
  db: DatabaseType = getDb(),
): Promise<IssueLabel[]> {
  const schema = getDbSchema(db);
  const rows = await (db as any)
    .select({
      categoryId: schema.issueLabel.categoryId,
      categoryName: schema.issueLabelCategory.name,
      color: schema.issueLabel.color,
      labelId: schema.issueLabel.id,
      name: schema.issueLabel.name,
    })
    .from(schema.issueLabel)
    .innerJoin(
      schema.issueLabelCategory,
      eq(schema.issueLabel.categoryId, schema.issueLabelCategory.id),
    )
    .where(eq(schema.issueLabel.projectId, projectId))
    .orderBy(
      asc(schema.issueLabelCategory.name),
      asc(schema.issueLabel.name),
      asc(schema.issueLabel.id),
    );

  return rows
    .map((row: any) => {
      const categoryName = normalizeNullableText(row.categoryName);
      const color = normalizeNullableText(row.color);
      const name = normalizeNullableText(row.name);
      if (
        !categoryName ||
        !color ||
        !name ||
        !Number.isInteger(row.categoryId) ||
        row.categoryId <= 0 ||
        !Number.isInteger(row.labelId) ||
        row.labelId <= 0
      ) {
        return null;
      }

      return {
        categoryId: row.categoryId,
        categoryName,
        color,
        labelId: row.labelId,
        name,
        ownerName,
        projectName,
      } satisfies IssueLabel;
    })
    .filter((row: IssueLabel | null): row is IssueLabel => row !== null);
}

export async function readIssueLabelByProjectAndId(
  projectId: number,
  labelId: number,
  ownerName: string,
  projectName: string,
  db: DatabaseType = getDb(),
): Promise<IssueLabel | null> {
  const schema = getDbSchema(db);
  const [row] = await (db as any)
    .select({
      categoryId: schema.issueLabel.categoryId,
      categoryName: schema.issueLabelCategory.name,
      color: schema.issueLabel.color,
      labelId: schema.issueLabel.id,
      name: schema.issueLabel.name,
    })
    .from(schema.issueLabel)
    .innerJoin(
      schema.issueLabelCategory,
      eq(schema.issueLabel.categoryId, schema.issueLabelCategory.id),
    )
    .where(and(eq(schema.issueLabel.projectId, projectId), eq(schema.issueLabel.id, labelId)))
    .limit(1);

  if (!row) {
    return null;
  }

  const categoryName = normalizeNullableText(row.categoryName);
  const color = normalizeNullableText(row.color);
  const name = normalizeNullableText(row.name);
  if (
    !categoryName ||
    !color ||
    !name ||
    !Number.isInteger(row.categoryId) ||
    row.categoryId <= 0 ||
    !Number.isInteger(row.labelId) ||
    row.labelId <= 0
  ) {
    return null;
  }

  return {
    categoryId: row.categoryId,
    categoryName,
    color,
    labelId: row.labelId,
    name,
    ownerName,
    projectName,
  } satisfies IssueLabel;
}

export async function createIssueLabelRecord(
  input: {
    categoryId: number;
    color: string;
    name: string;
    projectId: number;
  },
  db: DatabaseType = getDb(),
): Promise<number> {
  const schema = getDbSchema(db);
  const [inserted] = await (db as any)
    .insert(schema.issueLabel)
    .values({
      categoryId: input.categoryId,
      color: input.color,
      name: input.name,
      projectId: input.projectId,
    })
    .returning({
      labelId: schema.issueLabel.id,
    });

  if (!inserted || !Number.isInteger(inserted.labelId) || inserted.labelId <= 0) {
    throw new Error("Failed to create issue label record.");
  }

  return inserted.labelId;
}

export async function updateIssueLabelRecord(
  input: {
    categoryId: number;
    color: string;
    labelId: number;
    name: string;
    projectId: number;
  },
  db: DatabaseType = getDb(),
): Promise<void> {
  const schema = getDbSchema(db);
  await (db as any)
    .update(schema.issueLabel)
    .set({
      categoryId: input.categoryId,
      color: input.color,
      name: input.name,
    })
    .where(
      and(
        eq(schema.issueLabel.projectId, input.projectId),
        eq(schema.issueLabel.id, input.labelId),
      ),
    );
}

export async function deleteIssueLabelRecord(
  projectId: number,
  labelId: number,
  db: DatabaseType = getDb(),
): Promise<void> {
  const schema = getDbSchema(db);
  await (db as any)
    .delete(schema.issueLabel)
    .where(and(eq(schema.issueLabel.projectId, projectId), eq(schema.issueLabel.id, labelId)));
}

export async function listMilestonesByProject(
  projectId: number,
  ownerName: string,
  projectName: string,
  db: DatabaseType = getDb(),
): Promise<Milestone[]> {
  const schema = getDbSchema(db);
  const rows = await (db as any)
    .select({
      contents: schema.milestone.contents,
      dueDate: schema.milestone.dueDate,
      milestoneId: schema.milestone.id,
      state: schema.milestone.state,
      title: schema.milestone.title,
    })
    .from(schema.milestone)
    .where(eq(schema.milestone.projectId, projectId))
    .orderBy(asc(schema.milestone.dueDate), asc(schema.milestone.id));

  return rows
    .map((row: any) => {
      const title = normalizeNullableText(row.title);
      if (!title || !Number.isInteger(row.milestoneId) || row.milestoneId <= 0) {
        return null;
      }

      return {
        contents: normalizeNullableText(row.contents),
        dueDate: normalizeNullableDate(row.dueDate),
        milestoneId: row.milestoneId,
        ownerName,
        projectName,
        state: milestoneStateFromRaw(row.state ?? null),
        title,
      } satisfies Milestone;
    })
    .filter((row: Milestone | null): row is Milestone => row !== null);
}

export async function readMilestoneByProjectAndId(
  projectId: number,
  milestoneId: number,
  ownerName: string,
  projectName: string,
  db: DatabaseType = getDb(),
): Promise<Milestone | null> {
  const schema = getDbSchema(db);
  const [row] = await (db as any)
    .select({
      contents: schema.milestone.contents,
      dueDate: schema.milestone.dueDate,
      milestoneId: schema.milestone.id,
      state: schema.milestone.state,
      title: schema.milestone.title,
    })
    .from(schema.milestone)
    .where(and(eq(schema.milestone.projectId, projectId), eq(schema.milestone.id, milestoneId)))
    .limit(1);

  if (!row) {
    return null;
  }

  const title = normalizeNullableText(row.title);
  if (!title || !Number.isInteger(row.milestoneId) || row.milestoneId <= 0) {
    return null;
  }

  return {
    contents: normalizeNullableText(row.contents),
    dueDate: normalizeNullableDate(row.dueDate),
    milestoneId: row.milestoneId,
    ownerName,
    projectName,
    state: milestoneStateFromRaw(row.state ?? null),
    title,
  } satisfies Milestone;
}

export async function createMilestoneRecord(
  input: {
    contents: null | string;
    dueDate: Date | null;
    projectId: number;
    state: MilestoneState;
    title: string;
  },
  db: DatabaseType = getDb(),
): Promise<number> {
  const schema = getDbSchema(db);
  const [inserted] = await (db as any)
    .insert(schema.milestone)
    .values({
      contents: input.contents,
      dueDate: input.dueDate,
      projectId: input.projectId,
      state: milestoneStateToRaw(input.state),
      title: input.title,
    })
    .returning({
      milestoneId: schema.milestone.id,
    });

  if (!inserted || !Number.isInteger(inserted.milestoneId) || inserted.milestoneId <= 0) {
    throw new Error("Failed to create milestone record.");
  }

  return inserted.milestoneId;
}

export async function updateMilestoneRecord(
  input: {
    contents: null | string;
    dueDate: Date | null;
    milestoneId: number;
    projectId: number;
    state: MilestoneState;
    title: string;
  },
  db: DatabaseType = getDb(),
): Promise<void> {
  const schema = getDbSchema(db);
  await (db as any)
    .update(schema.milestone)
    .set({
      contents: input.contents,
      dueDate: input.dueDate,
      state: milestoneStateToRaw(input.state),
      title: input.title,
    })
    .where(
      and(
        eq(schema.milestone.projectId, input.projectId),
        eq(schema.milestone.id, input.milestoneId),
      ),
    );
}

export async function deleteMilestoneRecord(
  projectId: number,
  milestoneId: number,
  db: DatabaseType = getDb(),
): Promise<void> {
  const schema = getDbSchema(db);
  await (db as any)
    .delete(schema.milestone)
    .where(and(eq(schema.milestone.projectId, projectId), eq(schema.milestone.id, milestoneId)));
}
