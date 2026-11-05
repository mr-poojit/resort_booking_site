import { connection } from "next/server";
import Link from "next/link";
import { AdminConsole } from "@/components/admin-console";

export const instant = false;

export default async function AdminPage() {
  await connection();
  const initialDate = new Date().toISOString().slice(0, 10);
  return (
    <main className="mx-auto min-h-screen max-w-360 px-5 sm:px-8 lg:px-14">
      <header className="border-line flex min-h-20 items-center justify-between border-b">
        <Link
          className="text-estate-green text-xs font-semibold tracking-[0.12em]"
          href="/"
        >
          COMPANY A
          <span className="text-muted-green mt-1 block text-[10px] font-normal">
            STAFF WORKSPACE
          </span>
        </Link>
        <Link className="text-estate-green text-sm underline" href="/">
          Guest site
        </Link>
      </header>
      <AdminConsole initialDate={initialDate} />
    </main>
  );
}
