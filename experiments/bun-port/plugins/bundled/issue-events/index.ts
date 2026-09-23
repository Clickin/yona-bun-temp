import type { IssueCommittedEvent, PluginDefinition } from "../../sdk";

export function createIssueEventsPlugin(
  options: { afterWrite?: () => void | Promise<void> } = {},
): PluginDefinition {
  return {
    manifest: { id: "issue-events", apiVersion: 1 },
    async start(context) {
      await context.storage.put("lifecycle", "started");
      const unsubscribe = context.onIssueCommitted(async (event: IssueCommittedEvent) => {
        const key = `event.${event.eventId}`;
        if (await context.storage.get(key)) return;

        const record = JSON.stringify(event);
        const outcome = await context.sink.writeOnce(`${event.eventId}.json`, record);
        await context.storage.put(key, "written");
        if (outcome === "created") {
          const previous = Number((await context.storage.get("records-created")) ?? "0");
          await context.storage.put("records-created", String(previous + 1));
        }
        await options.afterWrite?.();
      });
      return {
        async dispose() {
          unsubscribe();
          await context.storage.put("lifecycle", "disposed");
        },
      };
    },
  };
}

export const issueEventsPlugin = createIssueEventsPlugin();
