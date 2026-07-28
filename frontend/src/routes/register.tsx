import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/register")({
  beforeLoad: ({ location }) => {
    throw redirect({
      href: `/users/signupform${location.searchStr}`,
      replace: true,
    });
  },
});
