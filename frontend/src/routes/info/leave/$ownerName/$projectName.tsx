import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { deleteProjectMemberRest } from "../../../../api/org-project";
import { apiQueryKeys } from "../../../../api/query-keys";
import { currentSessionQueryOptions } from "../../../../api/session";
import type { YonaRecord } from "../../../../api/types";
import { readSessionBootstrap } from "../../../../auth-workspace-client";
import { LegacyI18nProvider } from "../../../../i18n";
import { YonaQueryProvider } from "../../../../query-client";
import { prefixBasePath, type RuntimeConfig } from "../../../../runtime-config";

export const Route = createFileRoute("/info/leave/$ownerName/$projectName")({
  component: UserProjectLeaveRoute,
});

function UserProjectLeaveRoute() {
  const { runtimeConfig } = Route.useRouteContext();

  return (
    <YonaQueryProvider>
      <LegacyI18nProvider supportedLanguages={runtimeConfig.supportedLanguages}>
        <UserProjectLeaveScreen runtimeConfig={runtimeConfig} />
      </LegacyI18nProvider>
    </YonaQueryProvider>
  );
}

function UserProjectLeaveScreen({ runtimeConfig }: { runtimeConfig: RuntimeConfig }) {
  const { ownerName, projectName } = Route.useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const sessionQuery = useQuery(currentSessionQueryOptions(runtimeConfig));
  const hasStarted = useRef(false);
  const leaveMutation = useMutation({
    mutationFn: async (input: { loginId: string; userId: number }) => {
      const { csrfToken } = await readSessionBootstrap(runtimeConfig);
      return deleteProjectMemberRest(runtimeConfig, csrfToken, {
        ownerName,
        projectName,
        userId: input.userId,
      });
    },
    onSuccess(_response, input) {
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.user.profile(input.loginId, { daysAgo: 14, selected: "projects" }),
      });
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.members(ownerName, projectName),
      });
      queryClient.invalidateQueries({
        queryKey: apiQueryKeys.project.base(ownerName, projectName),
      });
    },
    onSettled(_response, _error, input) {
      router.history.push(
        prefixBasePath(
          runtimeConfig.basePath,
          `/${encodeURIComponent(input.loginId)}?daysAgo=14&selected=projects`,
        ),
      );
    },
  });

  useEffect(() => {
    const session = sessionQuery.data;
    if (hasStarted.current || !session) {
      return;
    }
    const loginId = stringField(session, "loginId");
    const userId = numberField(session, "actorId");
    if (!loginId || userId <= 0) {
      return;
    }
    hasStarted.current = true;
    leaveMutation.mutate({ loginId, userId });
  }, [leaveMutation, sessionQuery.data]);

  return null;
}

function numberField(record: YonaRecord, key: string) {
  const value = record[key];
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function stringField(record: YonaRecord, key: string) {
  const value = record[key];
  return typeof value === "string" ? value : "";
}
