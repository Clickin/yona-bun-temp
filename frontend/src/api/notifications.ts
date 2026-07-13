import { queryOptions } from "@tanstack/react-query";
import type { RuntimeConfig } from "../runtime-config";
import { apiQueryKeys } from "./query-keys";
import { restFetch } from "./rest-client";

export type NotificationsListInput = {
  from: number;
  size: number;
};

export type NotificationActor = {
  avatarUrl: string;
  displayName: string;
  loginId: string;
};

export type NotificationItem = {
  actor: NotificationActor;
  createdAt: string;
  createdLabel: string;
  eventType: string;
  id: string;
  message: string;
  targetHref: string;
  targetTitle: string;
  typeIcon: string;
};

export type NotificationsListResponse = {
  hasMore: boolean;
  items: NotificationItem[];
  total: number;
};

function normalizeNotificationsResponse(
  response: Partial<NotificationsListResponse>,
): NotificationsListResponse {
  const items = (response.items ?? []).map((item) => ({
    actor: {
      avatarUrl: item.actor?.avatarUrl ?? "",
      displayName: item.actor?.displayName ?? "",
      loginId: item.actor?.loginId ?? "",
    },
    createdAt: item.createdAt ?? "",
    createdLabel: item.createdLabel ?? "",
    eventType: item.eventType ?? "",
    id: item.id ?? "",
    message: item.message ?? "",
    targetHref: item.targetHref ?? "",
    targetTitle: item.targetTitle ?? "",
    typeIcon: item.typeIcon ?? "megaphone",
  }));
  return {
    hasMore: response.hasMore ?? false,
    items,
    total: response.total ?? items.length,
  };
}

export function listNotificationsRest(
  runtimeConfig: RuntimeConfig,
  input: NotificationsListInput,
  fetchImpl: typeof fetch = fetch,
): Promise<NotificationsListResponse> {
  const query = new URLSearchParams();
  query.set("from", String(input.from));
  query.set("size", String(input.size));
  return restFetch<Partial<NotificationsListResponse>>(
    runtimeConfig,
    `/notifications?${query.toString()}`,
    { fetchImpl },
  ).then(normalizeNotificationsResponse);
}

export function listNotificationsQueryOptions(
  runtimeConfig: RuntimeConfig,
  input: NotificationsListInput,
) {
  return queryOptions({
    queryFn: () => listNotificationsRest(runtimeConfig, input),
    queryKey: apiQueryKeys.notifications.list(input),
  });
}
