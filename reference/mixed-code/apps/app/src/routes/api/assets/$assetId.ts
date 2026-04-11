import { createFileRoute } from "@tanstack/react-router";
import { handleAssetRequest } from "@app/lib/asset-delivery";

export const Route = createFileRoute("/api/assets/$assetId")({
  server: {
    handlers: {
      GET: async ({ params, request }) =>
        handleAssetRequest({
          assetId: params.assetId,
          disposition: "inline",
          request,
        }),
    },
  },
});
