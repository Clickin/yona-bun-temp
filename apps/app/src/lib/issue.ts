import { createServerFn } from "@tanstack/react-start";
import {
  issueCommentCreateInputSchema,
  issueDetailSchema,
  issueRefSchema,
  issueStateUpdateInputSchema,
  issueSummarySchema,
  projectRefSchema,
} from "@yona/contracts";

const issueCreateInputSchema = projectRefSchema
  .extend({
    body: issueDetailSchema.shape.body,
    title: issueSummarySchema.shape.title,
  })
  .strict();

export const listIssues = createServerFn({ method: "GET" })
  .inputValidator(projectRefSchema)
  .handler(async ({ data }) => {
    const { createServerIssueCaller } = await import("./issue-trpc.server");
    return issueSummarySchema.array().parse(await createServerIssueCaller().listIssues(data));
  });

export const readIssueDetail = createServerFn({ method: "GET" })
  .inputValidator(issueRefSchema)
  .handler(async ({ data }) => {
    const { createServerIssueCaller } = await import("./issue-trpc.server");
    return issueDetailSchema.parse(await createServerIssueCaller().readIssueDetail(data));
  });

export const createIssue = createServerFn({ method: "POST" })
  .inputValidator(issueCreateInputSchema)
  .handler(async ({ data }) => {
    const { createServerIssueCaller } = await import("./issue-trpc.server");
    return issueDetailSchema.parse(await createServerIssueCaller().createIssue(data));
  });

export const createIssueComment = createServerFn({ method: "POST" })
  .inputValidator(issueCommentCreateInputSchema)
  .handler(async ({ data }) => {
    const { createServerIssueCaller } = await import("./issue-trpc.server");
    return issueDetailSchema.parse(await createServerIssueCaller().createIssueComment(data));
  });

export const updateIssueState = createServerFn({ method: "POST" })
  .inputValidator(issueStateUpdateInputSchema)
  .handler(async ({ data }) => {
    const { createServerIssueCaller } = await import("./issue-trpc.server");
    return issueDetailSchema.parse(await createServerIssueCaller().updateIssueState(data));
  });
