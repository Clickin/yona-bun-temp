import { createFileRoute } from "@tanstack/react-router";
import { NotificationRouteComponent } from "../notification/route";

export const Route = createFileRoute("/notifications")({
  component: () => <NotificationRouteComponent routePath="/notifications" />,
});
