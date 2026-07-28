import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/forgot-password")({
  beforeLoad: ({ location }) => {
    throw redirect({
      href: `/lostPassword${location.searchStr}`,
      replace: true,
    });
  },
});
