import { createFileRoute } from "@tanstack/react-router";
import { useAppRuntime } from "../../app-runtime-context";
import { UIKitPage } from "../-ui-kit-views";
import { useDocumentTitle } from "../-shared";

export const Route = createFileRoute("/_UIKit")({
  component: UIKitRouteComponent,
});

function UIKitRouteComponent() {
  const { runtimeConfig } = useAppRuntime();
  useDocumentTitle("Yobi UI");
  return <UIKitPage runtimeConfig={runtimeConfig} />;
}
