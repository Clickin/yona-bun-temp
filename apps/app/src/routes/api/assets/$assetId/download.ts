import { createFileRoute } from "@tanstack/react-router";
import { handleAssetRequest } from "@app/lib/asset-delivery";

export const Route = createFileRoute("/api/assets/$assetId/download")({
  server: {
    handlers: {
      GET: async ({ params, request }) =>
        handleAssetRequest({
          assetId: params.assetId,
          disposition: "attachment",
          request,
        }),
    },
  },
});
