import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  beforeLoad: ({ location }) => {
    const canonicalLegacyLoginFormHref = `/users/loginform${location.searchStr}`;
    throw redirect({
      href: canonicalLegacyLoginFormHref,
      replace: true,
    });
  },
});
