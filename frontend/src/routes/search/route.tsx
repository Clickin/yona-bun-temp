import { createFileRoute } from "@tanstack/react-router";
import { SearchRoutePage } from "../-search-views";

export const Route = createFileRoute("/search")({
  component: SearchRouteComponent,
});

function SearchRouteComponent() {
  return <SearchRoutePage scope={{ type: "global" }} />;
}
