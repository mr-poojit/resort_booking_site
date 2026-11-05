import Link from "next/link";
import { connection } from "next/server";
import {
  AvailabilityResults,
  StaySearchForm,
} from "@/components/guest-workflows";
import { BrandMark } from "@/components/brand-mark";

export const instant = false;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function StaysPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await connection();
  const params = await searchParams;
  const value = (key: string, fallback: string) => {
    const result = params[key];
    return typeof result === "string" ? result : fallback;
  };
  const checkIn = value("checkIn", futureDate(7));
  const checkOut = value("checkOut", futureDate(9));
  const adults = Number(value("adults", "2")) || 2;
  const children = Number(value("children", "0")) || 0;
  const category = value("category", "");

  return (
    <main className="mx-auto min-h-screen max-w-360 px-5 sm:px-8 lg:px-14">
      <header className="border-line flex min-h-20 items-center justify-between border-b">
        <BrandMark />
        <Link className="text-estate-green text-sm underline" href="/events">
          Gatherings
        </Link>
      </header>
      <section className="py-10 sm:py-14">
        <p className="text-muted-green text-xs tracking-[0.15em] uppercase">
          Rooms and villas
        </p>
        <h1 className="text-estate-green mt-2 font-serif text-4xl">
          Find your stay
        </h1>
        <p className="text-foreground/70 mt-3 max-w-xl text-sm leading-6">
          Choose dates to see current website availability and the full price,
          including GST.
        </p>
        <div className="mt-7">
          <StaySearchForm initial={{ checkIn, checkOut, adults, children }} />
        </div>
        <AvailabilityResults
          search={{ checkIn, checkOut, adults, children }}
          onlyCategory={category || undefined}
        />
      </section>
      <footer className="border-line text-muted-green border-t py-5 text-xs">
        <Link className="underline" href="/privacy">
          Privacy
        </Link>{" "}
        · Rates and allotments shown are for direct website sales.
      </footer>
    </main>
  );
}

function futureDate(offset: number): string {
  return new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
}
