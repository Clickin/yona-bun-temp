import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  beforeLoad: ({ location }) => {
    throw redirect({
      href: `/users/loginform${location.searchStr}`,
      replace: true,
    });
  },
  component: LoginAliasRoute,
});

function LoginAliasRoute() {
  return null;
}
