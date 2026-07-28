import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/forgot-password")({
  beforeLoad: ({ location }) => {
    const canonicalLegacyLostPasswordHref = `/lostPassword${location.searchStr}`;
    throw redirect({
      href: canonicalLegacyLostPasswordHref,
      replace: true,
    });
  },
});
