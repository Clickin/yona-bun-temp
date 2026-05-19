import { describe, expect, it, vi } from "vitest";
import { createProjectMilestoneRest, updateProjectMilestoneRest } from "./api/milestones";

const runtimeConfig = { apiBaseUrl: "/yona/api", basePath: "/yona" };

function milestoneFetch() {
  return vi.fn(async () =>
    Response.json({
      milestone: {
        id: "7",
        state: "open",
        title: "v1.0",
      },
    }),
  ) as unknown as typeof fetch;
}

describe("milestone attachment upload payloads", () => {
  it("serializes create attachment ids into the milestone REST body", async () => {
    const fetchImpl = milestoneFetch();

    await createProjectMilestoneRest(
      runtimeConfig,
      "csrf-123",
      {
        attachmentIds: [841n, 842n],
        contentsMarkdown: "![paste.png](/yona/files/841) ![drop.png](/yona/files/842) ",
        ownerName: "admin",
        projectName: "projectYobi",
        title: "v1.0",
      },
      fetchImpl,
    );

    const [url, init] = vi.mocked(fetchImpl).mock.calls[0];
    expect(url).toBe("/yona/api/v1/owners/admin/projects/projectYobi/milestones");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toMatchObject({
      attachmentIds: [841, 842],
      contentsMarkdown: "![paste.png](/yona/files/841) ![drop.png](/yona/files/842) ",
    });
  });

  it("serializes update attachment ids into the milestone REST body", async () => {
    const fetchImpl = milestoneFetch();

    await updateProjectMilestoneRest(
      runtimeConfig,
      "csrf-123",
      {
        attachmentIds: [843n],
        contentsMarkdown: "Ship parity![edit.png](/yona/files/843) ",
        milestoneId: 7n,
        ownerName: "admin",
        projectName: "projectYobi",
        title: "v1.0",
      },
      fetchImpl,
    );

    const [url, init] = vi.mocked(fetchImpl).mock.calls[0];
    expect(url).toBe("/yona/api/v1/owners/admin/projects/projectYobi/milestones/7");
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(init?.body as string)).toMatchObject({
      attachmentIds: [843],
      contentsMarkdown: "Ship parity![edit.png](/yona/files/843) ",
    });
  });
});
