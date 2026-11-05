import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import {
  AvailabilityResults,
  StaySearchForm,
} from "@/components/guest-workflows";
import { BrandMark } from "@/components/brand-mark";
import { roomCategories } from "@/server/demo-store";

export const instant = false;

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StayDetailPage({
  params,
  searchParams,
}: PageProps) {
  await connection();
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const category = roomCategories.find((item) => item.slug === slug);
  if (!category) notFound();
  const value = (key: string, fallback: string) =>
    typeof query[key] === "string" ? (query[key] as string) : fallback;
  const checkIn = value("checkIn", futureDate(7));
  const checkOut = value("checkOut", futureDate(9));
  const adults = Number(value("adults", "2")) || 2;
  const children = Number(value("children", "0")) || 0;

  return (
    <main className="mx-auto min-h-screen max-w-360 px-5 sm:px-8 lg:px-14">
      <header className="border-line flex min-h-20 items-center justify-between border-b">
        <BrandMark />
        <Link href="/stays" className="text-estate-green text-sm underline">
          All stays
        </Link>
      </header>
      <section className="grid gap-8 py-8 lg:grid-cols-[1fr_0.8fr] lg:py-12">
        <figure className="relative aspect-[1.25] overflow-hidden rounded-sm bg-[#dfe5dc]">
          <Image
            src={category.imagePath}
            alt={`${category.name}, illustrative stock photograph; not the resort property`}
            fill
            loading="eager"
            sizes="(max-width: 1024px) 100vw, 55vw"
            className="object-cover"
          />
          <figcaption className="bg-soft-white/90 text-estate-green absolute right-3 bottom-3 px-3 py-2 text-[10px] tracking-[0.12em] uppercase">
            Illustrative photo · not the property
          </figcaption>
        </figure>
        <div className="self-center">
          <p className="text-muted-green text-xs tracking-[0.15em] uppercase">
            {category.totalUnits} keys in this category · Sleeps{" "}
            {category.maxGuests}
          </p>
          <h1 className="text-estate-green mt-3 font-serif text-4xl">
            {category.name}
          </h1>
          <p className="text-foreground/70 mt-4 text-sm leading-7">
            {category.description} The image is illustrative stock photography,
            not a photograph of this property.
          </p>
          <div className="border-line mt-6 border-y py-5">
            <h2 className="text-estate-green font-serif text-xl">Rate plans</h2>
            <p className="text-foreground/70 mt-2 text-sm leading-6">
              Flexible: free cancellation until 7 days before check-in.
              Non-refundable: charged in full when you book. Taxes are
              calculated nightly from the tariff.
            </p>
          </div>
        </div>
      </section>
      <section className="border-line border-t py-8">
        <h2 className="text-estate-green font-serif text-2xl">
          Availability and price
        </h2>
        <div className="mt-4">
          <StaySearchForm initial={{ checkIn, checkOut, adults, children }} />
        </div>
        <AvailabilityResults
          search={{ checkIn, checkOut, adults, children }}
          onlyCategory={slug}
        />
      </section>
    </main>
  );
}

function futureDate(offset: number): string {
  return new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
}
