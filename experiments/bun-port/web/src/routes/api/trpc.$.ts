import { createFileRoute } from "@tanstack/react-router";
import { handleTrpcRequest } from "../../../../backend/rpc";

const forward = ({ request }: { request: Request }) => handleTrpcRequest(request);

export const Route = createFileRoute("/api/trpc/$")({
  server: {
    handlers: {
      GET: forward,
      POST: forward,
    },
  },
});
