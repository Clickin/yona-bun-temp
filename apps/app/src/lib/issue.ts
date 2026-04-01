import { createServerFn } from "@tanstack/react-start";
import {
  issueAssignInputSchema,
  issueCommentCreateInputSchema,
  issueDetailSchema,
  issueRefSchema,
  issueStateUpdateInputSchema,
  issueSummarySchema,
  projectRefSchema,
  issueUnassignInputSchema,
  issueUnvoteInputSchema,
  issueUnwatchInputSchema,
  issueVoteInputSchema,
  issueWatchInputSchema,
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

export const watchIssue = createServerFn({ method: "POST" })
  .inputValidator(issueWatchInputSchema)
  .handler(async ({ data }) => {
    const { createServerIssueCaller } = await import("./issue-trpc.server");
    return issueDetailSchema.parse(await createServerIssueCaller().watchIssue(data));
  });

export const unwatchIssue = createServerFn({ method: "POST" })
  .inputValidator(issueUnwatchInputSchema)
  .handler(async ({ data }) => {
    const { createServerIssueCaller } = await import("./issue-trpc.server");
    return issueDetailSchema.parse(await createServerIssueCaller().unwatchIssue(data));
  });

export const voteIssue = createServerFn({ method: "POST" })
  .inputValidator(issueVoteInputSchema)
  .handler(async ({ data }) => {
    const { createServerIssueCaller } = await import("./issue-trpc.server");
    return issueDetailSchema.parse(await createServerIssueCaller().voteIssue(data));
  });

export const unvoteIssue = createServerFn({ method: "POST" })
  .inputValidator(issueUnvoteInputSchema)
  .handler(async ({ data }) => {
    const { createServerIssueCaller } = await import("./issue-trpc.server");
    return issueDetailSchema.parse(await createServerIssueCaller().unvoteIssue(data));
  });

export const assignIssue = createServerFn({ method: "POST" })
  .inputValidator(issueAssignInputSchema)
  .handler(async ({ data }) => {
    const { createServerIssueCaller } = await import("./issue-trpc.server");
    return issueDetailSchema.parse(await createServerIssueCaller().assignIssue(data));
  });

export const unassignIssue = createServerFn({ method: "POST" })
  .inputValidator(issueUnassignInputSchema)
  .handler(async ({ data }) => {
    const { createServerIssueCaller } = await import("./issue-trpc.server");
    return issueDetailSchema.parse(await createServerIssueCaller().unassignIssue(data));
  });
