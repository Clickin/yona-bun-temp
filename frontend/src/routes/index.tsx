import { createFileRoute } from "@tanstack/react-router";
import { useAppRuntime } from "../app-runtime-context";
import { HomePage } from "./-home-view";
import { useDocumentTitle } from "./-shared";

export const Route = createFileRoute("/")({
  component: IndexRouteComponent,
});

function IndexRouteComponent() {
  useDocumentTitle("Yona");
  const { runtimeConfig } = useAppRuntime();
  return <HomePage runtimeConfig={runtimeConfig} />;
}
