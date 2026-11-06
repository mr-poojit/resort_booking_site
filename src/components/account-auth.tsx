"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Button, Input, Label } from "@/components/ui";

type GuestUser = {
  email: string;
  name: string;
  provider: "email" | "google";
};

type Mode = "signin" | "signup";

export function AccountAuth({
  googleEnabled,
  initialError = "",
  initialUser = null,
}: {
  googleEnabled: boolean;
  initialError?: string;
  initialUser?: GuestUser | null;
}) {
  const [mode, setMode] = useState<Mode>("signin");
  const [user, setUser] = useState<GuestUser | null>(initialUser);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (mode === "signup" && password !== confirm) {
      setError("Those passwords do not match.");
      return;
    }
    setBusy(true);
    const response = await fetch(
      mode === "signup" ? "/api/auth/guest/signup" : "/api/auth/guest/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "signup" ? { name, email, password } : { email, password },
        ),
      },
    );
    const data = (await response.json().catch(() => null)) as {
      error?: string;
      user?: GuestUser;
    } | null;
    setBusy(false);
    if (!response.ok || !data?.user) {
      setError(data?.error ?? "Something went wrong. Try again.");
      return;
    }
    setUser(data.user);
    setPassword("");
    setConfirm("");
  }

  async function signOut() {
    setBusy(true);
    await fetch("/api/auth/guest/session", { method: "DELETE" });
    setUser(null);
    setBusy(false);
  }

  return (
    <section className="border-line bg-soft-white rounded-sm border p-6 sm:p-8">
      {user ? (
        <div>
          <p className="text-muted-green text-xs tracking-[0.15em] uppercase">
            Signed in
          </p>
          <h2 className="text-estate-green mt-3 font-serif text-3xl">
            {user.name}
          </h2>
          <p className="text-foreground/75 mt-3 text-sm leading-6">
            {user.email}
          </p>
          <p className="text-muted-green mt-1 text-sm">
            {user.provider === "google" ? "Google" : "Email and password"}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/stays"
              className="bg-estate-green inline-flex min-h-11 items-center rounded-sm px-5 text-sm font-medium text-white"
            >
              Find a stay
            </Link>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={signOut}
            >
              Sign out
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <div
            className="grid grid-cols-2 gap-2"
            role="tablist"
            aria-label="Account"
          >
            {(
              [
                ["signin", "Sign in"],
                ["signup", "Create account"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                className={`min-h-11 rounded-sm text-sm ${mode === value ? "bg-estate-green text-white" : "text-estate-green hover:bg-[#edf0e9]"}`}
                onClick={() => {
                  setMode(value);
                  setError("");
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {googleEnabled ? (
            <a
              href="/api/auth/guest/google"
              className="border-line text-estate-green mt-6 flex min-h-11 items-center justify-center rounded-sm border text-sm font-medium hover:bg-[#edf0e9]"
            >
              Continue with Google
            </a>
          ) : (
            <p className="text-muted-green mt-6 text-sm leading-6">
              Google sign-in appears here after you add the Google keys to
              `.env`.
            </p>
          )}

          <p className="text-muted-green mt-5 text-center text-xs tracking-[0.14em] uppercase">
            or use email
          </p>

          {error && (
            <p
              role="alert"
              className="border-copper mt-4 border-l-2 py-2 pl-4 text-sm"
            >
              {error}
            </p>
          )}

          <form className="mt-4 space-y-4" onSubmit={submit}>
            {mode === "signup" && (
              <div>
                <Label htmlFor="guest-name">Name</Label>
                <Input
                  id="guest-name"
                  name="name"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  minLength={2}
                  maxLength={80}
                />
              </div>
            )}
            <div>
              <Label htmlFor="guest-email">Email</Label>
              <Input
                id="guest-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="guest-password">Password</Label>
              <Input
                id="guest-password"
                name="password"
                type="password"
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={mode === "signup" ? 8 : 1}
              />
            </div>
            {mode === "signup" && (
              <div>
                <Label htmlFor="guest-confirm">Confirm password</Label>
                <Input
                  id="guest-confirm"
                  name="confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  required
                  minLength={8}
                />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy
                ? "Please wait…"
                : mode === "signup"
                  ? "Create account"
                  : "Sign in"}
            </Button>
          </form>
        </div>
      )}
    </section>
  );
}
