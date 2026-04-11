import { createServerFn } from "@tanstack/react-start";
import {
  postingCommentCreateInputSchema,
  postingDetailSchema,
  postingRefSchema,
  postingSummarySchema,
  projectRefSchema,
} from "@yona/contracts";

const postingCreateInputSchema = projectRefSchema
  .extend({
    body: postingDetailSchema.shape.body,
    title: postingSummarySchema.shape.title,
  })
  .strict();

export const listPostings = createServerFn({ method: "GET" })
  .inputValidator(projectRefSchema)
  .handler(async ({ data }) => {
    const { createServerPostingCaller } = await import("./posting-trpc.server");
    return postingSummarySchema.array().parse(await createServerPostingCaller().listPostings(data));
  });

export const readPostingDetail = createServerFn({ method: "GET" })
  .inputValidator(postingRefSchema)
  .handler(async ({ data }) => {
    const { createServerPostingCaller } = await import("./posting-trpc.server");
    return postingDetailSchema.parse(await createServerPostingCaller().readPostingDetail(data));
  });

export const createPosting = createServerFn({ method: "POST" })
  .inputValidator(postingCreateInputSchema)
  .handler(async ({ data }) => {
    const { createServerPostingCaller } = await import("./posting-trpc.server");
    return postingDetailSchema.parse(await createServerPostingCaller().createPosting(data));
  });

export const createPostingComment = createServerFn({ method: "POST" })
  .inputValidator(postingCommentCreateInputSchema)
  .handler(async ({ data }) => {
    const { createServerPostingCaller } = await import("./posting-trpc.server");
    return postingDetailSchema.parse(await createServerPostingCaller().createPostingComment(data));
  });
