import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { appRouter, createRpcContext } from "../../backend/rpc";

export const getServerIssueList = createServerFn({ method: "GET" }).handler(async () => {
  const caller = appRouter.createCaller(await createRpcContext(getRequest()));
  return caller.issue.homeList();
});

export const getServerIssue = createServerFn({ method: "GET" })
  .validator((input: { projectId: string; id: string }) => input)
  .handler(async ({ data }) => {
    const caller = appRouter.createCaller(await createRpcContext(getRequest()));
    const viewer = await caller.viewer();
    const issue = await caller.issue.read({ projectId: data.projectId, id: BigInt(data.id) });
    return { viewer, issue };
  });
