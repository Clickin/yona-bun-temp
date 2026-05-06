import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function createYonaQueryClient() {
  return new QueryClient({
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
}

export function YonaQueryProvider({ children }: React.PropsWithChildren) {
  const [queryClient] = React.useState(() => createYonaQueryClient());
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
