export async function loadProtectedShellData() {
  const { requireAuthenticatedAppSessionServer } = await import("./auth-trpc.server");
  await requireAuthenticatedAppSessionServer();

  return {
    lanes: [
      "Public dashboard preloads before render.",
      "Protected route redirects until the in-memory auth session exists.",
      "Password, registration, and reset flows mutate through createServerFn.",
    ],
    title: "Protected Workspace",
  };
}
