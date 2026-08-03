"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle, LogIn } from "lucide-react";

import { ApiError, apiRequest } from "@/lib/client-api";
import type { FieldErrors } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setErrors({});
    setMessage("");

    try {
      await apiRequest("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });

      // Only allow in-app destinations, never an attacker-supplied origin.
      const next = params.get("next");
      const target = next && next.startsWith("/admin") ? next : "/admin";

      router.replace(target);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fields);
        setMessage(error.message);
      } else {
        setMessage("Could not reach the server. Try again.");
      }
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      {message ? (
        <p
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300"
        >
          {message}
        </p>
      ) : null}

      <Field label="Email" htmlFor="email" error={errors.email} required>
        <Input
          id="email"
          type="email"
          name="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(errors.email)}
          placeholder="admin@flazzgroup.com"
        />
      </Field>

      <Field label="Password" htmlFor="password" error={errors.password} required>
        <Input
          id="password"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={Boolean(errors.password)}
          placeholder="••••••••"
        />
      </Field>

      <Button type="submit" variant="gold" size="lg" disabled={busy} className="mt-1 w-full">
        {busy ? (
          <LoaderCircle className="animate-spin" aria-hidden />
        ) : (
          <LogIn aria-hidden />
        )}
        {busy ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
