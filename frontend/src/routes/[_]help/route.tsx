import { createFileRoute } from "@tanstack/react-router";
import { useAppRuntime } from "../../app-runtime-context";
import { HelpTocPage } from "../-help-views";
import { useDocumentTitle } from "../-shared";

export const Route = createFileRoute("/_help")({
  component: HelpRouteComponent,
});

function HelpRouteComponent() {
  const { runtimeConfig } = useAppRuntime();
  useDocumentTitle("title.help");
  return <HelpTocPage siteName={runtimeConfig.siteName ?? "Yona"} />;
}
