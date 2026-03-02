import type { RequestEvent } from "@sveltejs/kit";
import { apiApp } from "@yona/api";

function normalizeRequest(event: RequestEvent, method: string, fallbackPath: string): Request {
  if (event.request instanceof Request) {
    return event.request;
  }

  const requestLike = event.request as {
    url?: string;
    method?: string;
    headers?: HeadersInit;
  } | null;
  const fallbackUrl =
    requestLike?.url ?? event.url?.toString() ?? `http://localhost${fallbackPath}`;

  return new Request(fallbackUrl, {
    method: requestLike?.method ?? method,
    headers: requestLike?.headers,
  });
}

export function forwardToApi(
  event: RequestEvent,
  method: string,
  fallbackPath = "/",
): ReturnType<typeof apiApp.fetch> {
  const request = normalizeRequest(event, method, fallbackPath);
  return apiApp.fetch(request, { event: { ...event, request }, request });
}
