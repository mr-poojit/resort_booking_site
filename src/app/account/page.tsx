import Link from "next/link";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { AccountAuth } from "@/components/account-auth";
import { BrandMark } from "@/components/brand-mark";
import {
  ensureDemoGuest,
  googleAuthConfigured,
  readGuestSession,
} from "@/server/guest-auth";

export const instant = false;

const googleErrors: Record<string, string> = {
  google_unconfigured:
    "Google sign-in is not set up yet. Add the Google keys in .env, or use email.",
  google_denied: "Google sign-in was cancelled.",
  google_failed: "Google sign-in could not be completed. Try again.",
  email_unverified: "That Google account does not have a verified email.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AccountPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await connection();
  const params = await searchParams;
  const code = typeof params.error === "string" ? params.error : "";
  const token = (await cookies()).get("wildfern_guest")?.value;
  const demoGuest = await ensureDemoGuest();
  const session = await readGuestSession(
    new Request("http://localhost/account", {
      headers: token ? { cookie: `wildfern_guest=${token}` } : {},
    }),
  );

  return (
    <main className="mx-auto min-h-screen max-w-360 px-5 sm:px-8 lg:px-14">
      <header className="border-line flex min-h-20 items-center justify-between border-b">
        <BrandMark />
        <Link className="text-estate-green text-sm underline" href="/">
          Home
        </Link>
      </header>
      <section className="grid gap-10 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:py-16">
        <div className="max-w-md">
          <p className="text-muted-green text-xs tracking-[0.15em] uppercase">
            Guest account
          </p>
          <h1 className="text-estate-green mt-3 font-serif text-4xl sm:text-5xl">
            Sign in to Wildfern
          </h1>
          <p className="text-foreground/75 mt-4 text-sm leading-7">
            Create an account with your email, or continue with Google. This is
            separate from the staff workspace.
          </p>
          <p className="text-muted-green mt-6 text-sm leading-6">
            Demo guest: <code>{demoGuest.email}</code>
            <br />
            Password: <code>{demoGuest.password}</code>
          </p>
          <p className="text-muted-green mt-4 text-sm leading-6">
            Resort staff use the{" "}
            <Link className="text-estate-green underline" href="/admin">
              staff workspace
            </Link>
            . Reservations, Sales, and the General Manager each have their own
            role.
          </p>
        </div>
        <AccountAuth
          googleEnabled={googleAuthConfigured()}
          initialError={googleErrors[code] ?? ""}
          initialUser={session}
        />
      </section>
    </main>
  );
}
