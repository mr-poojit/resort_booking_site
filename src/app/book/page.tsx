import Link from "next/link";
import { connection } from "next/server";
import { BookingFlow } from "@/components/guest-workflows";

export const instant = false;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function BookingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await connection();
  const params = await searchParams;
  const value = (key: string, fallback: string) =>
    typeof params[key] === "string" ? (params[key] as string) : fallback;
  return (
    <main className="mx-auto min-h-screen max-w-360 px-5 sm:px-8 lg:px-14">
      <header className="border-line flex min-h-20 items-center justify-between border-b">
        <Link
          className="text-estate-green text-xs font-semibold tracking-[0.12em]"
          href="/"
        >
          COMPANY A
          <span className="text-muted-green mt-1 block text-[10px] font-normal">
            COFFEE ESTATE · KARNATAKA
          </span>
        </Link>
        <Link className="text-estate-green text-sm underline" href="/stays">
          Change stay
        </Link>
      </header>
      <section className="py-8 sm:py-12">
        <BookingFlow
          initial={{
            checkIn: value("checkIn", futureDate(7)),
            checkOut: value("checkOut", futureDate(9)),
            adults: Number(value("adults", "2")) || 2,
            children: Number(value("children", "0")) || 0,
            category: value("category", "estate-room"),
            plan: value("plan", "FLEX"),
          }}
        />
      </section>
      <footer className="border-line text-muted-green border-t py-5 text-xs">
        <Link className="underline" href="/privacy">
          Privacy notice
        </Link>{" "}
        · Test-mode payment · No card data is collected
      </footer>
    </main>
  );
}

function futureDate(offset: number): string {
  return new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
}
