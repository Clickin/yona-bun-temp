import { createFileRoute } from "@tanstack/react-router";
import { useAppRuntime } from "../app-runtime-context";
import { HomePage } from "./-home-view";
import { useDocumentTitle } from "./-shared";

export const Route = createFileRoute("/")({
  component: IndexRouteComponent,
});

function IndexRouteComponent() {
  const { runtimeConfig } = useAppRuntime();
  useDocumentTitle(runtimeConfig.siteName ?? "Yona");
  return <HomePage runtimeConfig={runtimeConfig} />;
}
