import { createFileRoute } from "@tanstack/react-router";
import { useAppRuntime } from "../../app-runtime-context";
import { LostPasswordPage } from "../-auth-views";
import { useCurrentHref } from "../-shared";

export const Route = createFileRoute("/lostPassword")({
  component: LostPasswordRouteComponent,
});

function LostPasswordRouteComponent() {
  const { runtimeConfig } = useAppRuntime();
  const currentHref = useCurrentHref();
  return <LostPasswordPage routeHref={currentHref} runtimeConfig={runtimeConfig} />;
}
