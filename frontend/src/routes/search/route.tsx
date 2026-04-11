import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "../-shared";

export const Route = createFileRoute("/search")({
  component: SearchRouteComponent,
});

function SearchRouteComponent() {
  return <PlaceholderPage href="/search" title="Search" />;
}
