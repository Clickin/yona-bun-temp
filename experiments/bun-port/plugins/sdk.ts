export const HOST_PLUGIN_API_VERSION = 1 as const;

export interface Actor {
  userId: string;
  projectId: string;
  permissions: readonly string[];
}

export interface Issue {
  id: string;
  projectId: string;
  title: string;
  status: string;
  updatedAt: Date;
}

export interface IssueCommittedEvent {
  eventId: string;
  type: "issue.committed";
  issueId: string;
  projectId: string;
  committedAt: string;
}

export interface PluginManifest {
  id: string;
  apiVersion: number;
  entrypoint?: string;
  sha256?: string;
}

export interface PluginContext {
  readonly pluginId: string;
  readonly issues: {
    read(actor: Actor, issueId: string): Promise<Issue>;
  };
  readonly storage: {
    get(key: string): Promise<string | undefined>;
    put(key: string, value: string): Promise<void>;
  };
  readonly sink: {
    writeOnce(fileName: string, content: string): Promise<"created" | "existing">;
  };
  onIssueCommitted(handler: (event: IssueCommittedEvent) => void | Promise<void>): () => void;
}

export type ExtensionHandler = (actor: Actor, input: unknown) => unknown | Promise<unknown>;

export interface PluginRuntime {
  extensions?: Record<string, ExtensionHandler>;
  dispose?(): void | Promise<void>;
}

export interface PluginDefinition {
  manifest: PluginManifest;
  start(context: PluginContext): PluginRuntime | Promise<PluginRuntime>;
}
