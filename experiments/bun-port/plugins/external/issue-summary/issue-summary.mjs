const definition = {
  manifest: { id: "issue-summary", apiVersion: 1 },
  async start(context) {
    await context.storage.put("lifecycle", "started");
    return {
      extensions: {
        "issue-summary.v1": async (actor, input) => {
          if (
            !actor ||
            !Array.isArray(actor.permissions) ||
            !actor.permissions.includes("issues:summary")
          ) {
            throw Object.assign(new Error("Actor lacks issues:summary permission"), {
              code: "ACL_PERMISSION_DENIED",
            });
          }
          if (!input || typeof input !== "object" || typeof input.issueId !== "string") {
            throw new TypeError("issue-summary.v1 input requires a string issueId");
          }
          const issue = await context.issues.read(actor, input.issueId);
          return {
            schemaVersion: 1,
            issueId: issue.id,
            title: issue.title,
            status: issue.status,
            updatedAt: issue.updatedAt,
          };
        },
      },
      async dispose() {
        await context.storage.put("lifecycle", "disposed");
      },
    };
  },
};

export default definition;
