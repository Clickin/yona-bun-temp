import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sidebar")({
  component: SidebarRouteComponent,
});

function SidebarRouteComponent() {
  return null;
}
