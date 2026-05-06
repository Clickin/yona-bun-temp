import type { RuntimeConfig } from "../runtime-config";

export interface RestErrorEnvelope {
  error: {
    code: string;
    message: string;
    status: number;
  };
}

export class RestApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(envelope: RestErrorEnvelope, fallbackStatus: number) {
    super(envelope.error.message);
    this.name = "RestApiError";
    this.code = envelope.error.code;
    this.status = envelope.error.status || fallbackStatus;
  }
}

export interface RestFetchOptions {
  body?: unknown;
  csrfToken?: string;
  fetchImpl?: typeof fetch;
  method?: string;
}

function apiV1Url(runtimeConfig: RuntimeConfig, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${runtimeConfig.apiBaseUrl}/v1${normalizedPath}`;
}

function isRestErrorEnvelope(value: unknown): value is RestErrorEnvelope {
  if (typeof value !== "object" || value === null || !("error" in value)) {
    return false;
  }
  const error = (value as { error?: unknown }).error;
  return typeof error === "object" && error !== null && "message" in error;
}

async function parseJson(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined;
  }

  const text = await response.text();
  if (text.trim() === "") {
    return undefined;
  }
  return JSON.parse(text) as unknown;
}

export async function restFetch<T>(
  runtimeConfig: RuntimeConfig,
  path: string,
  options: RestFetchOptions = {},
): Promise<T> {
  const method = options.method ?? (options.body === undefined ? "GET" : "POST");
  const headers = new Headers({
    Accept: "application/json",
  });

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.body);
  }
  if (options.csrfToken) {
    headers.set("x-csrf-token", options.csrfToken);
  }

  const response = await (options.fetchImpl ?? fetch)(apiV1Url(runtimeConfig, path), {
    body,
    credentials: "same-origin",
    headers,
    method,
  });
  const payload = await parseJson(response);

  if (!response.ok) {
    if (isRestErrorEnvelope(payload)) {
      throw new RestApiError(payload, response.status);
    }
    throw new RestApiError(
      {
        error: {
          code: "http_error",
          message: `REST request failed with ${response.status}.`,
          status: response.status,
        },
      },
      response.status,
    );
  }

  return payload as T;
}
