import * as React from "react";
import { QueryClient, QueryClientContext, QueryClientProvider } from "@tanstack/react-query";
import { apiQueryKeys } from "./api/query-keys";

let activeQueryClient: QueryClient | undefined;

export function createYonaQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        retry: 0,
      },
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 30_000,
      },
    },
  });
  queryClient.setQueryDefaults(apiQueryKeys.auth.capabilities(), {
    gcTime: Infinity,
    staleTime: Infinity,
  });
  return queryClient;
}

export function invalidateAuthenticationQueries() {
  if (!activeQueryClient) {
    return Promise.resolve();
  }

  return Promise.all([
    activeQueryClient.invalidateQueries({ queryKey: apiQueryKeys.session() }),
    activeQueryClient.invalidateQueries({ queryKey: apiQueryKeys.auth.capabilities() }),
  ]).then(() => undefined);
}

export function YonaQueryProvider({ children }: React.PropsWithChildren) {
  const parentQueryClient = React.use(QueryClientContext);
  if (parentQueryClient) {
    return children;
  }

  return <YonaQueryClientProvider>{children}</YonaQueryClientProvider>;
}

function YonaQueryClientProvider({ children }: React.PropsWithChildren) {
  const [queryClient] = React.useState(() => createYonaQueryClient());

  React.useEffect(() => {
    activeQueryClient = queryClient;
    return () => {
      if (activeQueryClient === queryClient) {
        activeQueryClient = undefined;
      }
    };
  }, [queryClient]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
