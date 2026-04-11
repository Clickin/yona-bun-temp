import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/user/editform")({
  component: EditFormLayoutRouteComponent,
});

function EditFormLayoutRouteComponent() {
  return <Outlet />;
}
