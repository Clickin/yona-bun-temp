import { useState } from "react";
import type { FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { trpcClient } from "../data";
export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState("alice");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      await trpcClient.auth.signIn.mutate({ identifier: loginId, password });
      await navigate({ to: "/issues" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Login failed");
    } finally {
      setPending(false);
    }
  }
  return (
    <main>
      <h1>Log in</h1>
      <form onSubmit={submit}>
        <label>
          Login ID or E-mail
          <input
            name="loginId"
            autoComplete="username"
            value={loginId}
            onChange={(event) => setLoginId(event.currentTarget.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
            required
          />
        </label>
        <button type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Log in"}
        </button>
      </form>
      {error ? <p role="alert">{error}</p> : null}
      <p>Only synthetic accounts in the isolated local fixture are accepted.</p>
    </main>
  );
}
