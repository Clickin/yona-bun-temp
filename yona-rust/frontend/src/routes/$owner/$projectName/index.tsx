import { createFileRoute } from "@tanstack/react-router";
import { ProjectDetailRouteComponent } from "./route";

export const Route = createFileRoute("/$owner/$projectName/")({
  component: ProjectDetailRouteComponent,
});
