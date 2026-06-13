import { createFileRoute } from "@tanstack/react-router";
import { HelpTocPage } from "../-help-views";
import { useDocumentTitle } from "../-shared";

export const Route = createFileRoute("/_help")({
  component: HelpRouteComponent,
});

function HelpRouteComponent() {
  useDocumentTitle("title.help");
  return <HelpTocPage />;
}
