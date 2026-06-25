import { prefixBasePath, type RuntimeConfig } from "../runtime-config";

export type LegacyTranslationResourceType = "issue" | "issue-comment" | "posting" | "post-comment";

export interface LegacyTranslationRequest {
  number: number;
  owner: string;
  projectName: string;
  type: LegacyTranslationResourceType;
}

export interface LegacyTranslationResponse {
  translated: string;
  translatedMarkdown?: string;
}

export async function translateLegacyResource(
  runtimeConfig: RuntimeConfig,
  csrfToken: string | undefined,
  body: LegacyTranslationRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const headers = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json",
  });
  if (csrfToken) {
    headers.set("x-csrf-token", csrfToken);
  }

  const response = await fetchImpl(
    prefixBasePath(runtimeConfig.basePath, "/-_-api/v1/translation"),
    {
      body: JSON.stringify(body),
      credentials: "same-origin",
      headers,
      method: "POST",
    },
  );

  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || `Translation failed with ${response.status}.`);
  }

  const payload = JSON.parse(text) as LegacyTranslationResponse;
  if (typeof payload.translatedMarkdown !== "string") {
    throw new Error("Translation response did not include Markdown source.");
  }
  return payload.translatedMarkdown;
}
