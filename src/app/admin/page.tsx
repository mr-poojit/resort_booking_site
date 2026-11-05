import { connection } from "next/server";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { AdminConsole } from "@/components/admin-console";

export const instant = false;

export default async function AdminPage() {
  await connection();
  const initialDate = new Date().toISOString().slice(0, 10);
  return (
    <main className="mx-auto min-h-screen max-w-360 px-5 sm:px-8 lg:px-14">
      <header className="border-line flex min-h-20 items-center justify-between border-b">
        <BrandMark detail="STAFF WORKSPACE" />
        <Link className="text-estate-green text-sm underline" href="/">
          Guest site
        </Link>
      </header>
      <AdminConsole initialDate={initialDate} />
    </main>
  );
}
