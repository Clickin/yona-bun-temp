import { createFileRoute } from "@tanstack/react-router";
import { UIKitPage } from "../-ui-kit-views";
import { useDocumentTitle } from "../-shared";

export const Route = createFileRoute("/_UIKit")({
  component: UIKitRouteComponent,
});

function UIKitRouteComponent() {
  useDocumentTitle("Yobi UI");
  return <UIKitPage />;
}
