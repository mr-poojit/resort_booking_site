import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { BrandMark } from "@/components/brand-mark";
import { StaySearchForm } from "@/components/guest-workflows";
import { BRAND_NAME } from "@/lib/brand";

export const instant = false;

const stays = [
  {
    name: "Rooms",
    count: "64 rooms",
    detail: "A slower start to the day.",
    image: "/images/estate-room.jpg",
    alt: "Illustrative photograph of a warm guest room; not the resort property.",
  },
  {
    name: "Villas",
    count: "12 villas",
    detail: "Room to settle in.",
    image: "/images/estate-villa.jpg",
    alt: "Illustrative woodland cabin photograph; not the resort property.",
  },
];

export default async function Home() {
  await connection();
  const checkIn = futureDate(7);
  const checkOut = futureDate(9);
  return (
    <main
      id="top"
      className="mx-auto min-h-screen max-w-360 px-5 sm:px-8 lg:px-14"
    >
      <header className="border-line flex min-h-20 items-center justify-between border-b">
        <BrandMark />
        <nav
          aria-label="Main navigation"
          className="flex items-center gap-6 text-sm"
        >
          <a
            className="hover:text-estate-green hidden transition-colors sm:inline"
            href="#stays"
          >
            The stays
          </a>
          <a
            className="hover:text-estate-green transition-colors"
            href="#gatherings"
          >
            Gatherings
          </a>
          <Link
            className="hover:text-estate-green transition-colors"
            href="/account"
          >
            Account
          </Link>
        </nav>
      </header>

      <section className="grid items-center gap-10 py-10 sm:py-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:py-20">
        <div className="max-w-xl">
          <p className="text-muted-green mb-5 text-xs font-medium tracking-[0.16em] uppercase">
            Chikkamagaluru, Karnataka
          </p>
          <h1 className="display-heading text-estate-green sm:text-display font-serif text-[3.5rem] leading-[0.98]">
            {BRAND_NAME}
          </h1>
          <p className="text-foreground/75 mt-6 max-w-md text-base leading-7">
            A quieter hillside stay, with rooms, villas and space to gather.
          </p>
          <a
            href="#stays"
            className="border-copper text-estate-green hover:text-copper mt-8 inline-flex min-h-12 items-center border-b-2 px-1 text-sm font-medium transition-colors"
          >
            Find your stay{" "}
            <span aria-hidden="true" className="ml-4 text-lg">
              ↘
            </span>
          </a>
        </div>

        <figure className="relative aspect-[1.16] overflow-hidden rounded-sm bg-[#dfe5dc]">
          <Image
            src="/images/wildfern-estate.jpg"
            alt="Illustrative photograph of layered green hills at sunrise; not the resort property."
            fill
            preload
            sizes="(max-width: 1024px) 100vw, 55vw"
            className="object-cover"
          />
          <figcaption className="bg-soft-white/90 text-estate-green absolute right-3 bottom-3 px-3 py-2 text-[10px] tracking-[0.12em] uppercase">
            Illustrative landscape
          </figcaption>
        </figure>
      </section>

      <section aria-label="Search availability" className="py-2">
        <StaySearchForm initial={{ checkIn, checkOut }} />
      </section>

      <section id="stays" className="border-line border-t py-12 sm:py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-muted-green text-xs tracking-[0.16em] uppercase">
              Make yourself at home
            </p>
            <h2 className="text-title text-estate-green mt-2 font-serif">
              Choose your stay
            </h2>
          </div>
          <p className="text-foreground/65 hidden max-w-xs text-right text-sm leading-6 sm:block">
            Compare current website availability and tax-inclusive rates.
          </p>
        </div>
        <div className="bg-line grid gap-px sm:grid-cols-2">
          {stays.map((stay, index) => (
            <Link
              key={stay.name}
              href="/stays"
              className="group bg-background hover:bg-soft-white p-6 transition-colors sm:p-8"
            >
              <div className="relative -mx-6 -mt-6 mb-6 aspect-[1.6] overflow-hidden rounded-sm bg-[#dfe5dc] sm:-mx-8 sm:-mt-8">
                <Image
                  src={stay.image}
                  alt={stay.alt}
                  fill
                  loading="lazy"
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </div>
              <span className="text-copper text-xs tracking-[0.14em] uppercase">
                0{index + 1}
              </span>
              <div className="mt-7 flex flex-wrap items-baseline justify-between gap-3">
                <h3 className="text-estate-green font-serif text-3xl">
                  {stay.name}
                </h3>
                <span className="text-muted-green text-sm">{stay.count}</span>
              </div>
              <p className="text-foreground/70 mt-2 text-sm">{stay.detail}</p>
            </Link>
          ))}
        </div>
      </section>

      <section
        id="gatherings"
        className="border-line mb-12 flex flex-col gap-5 border-t py-10 sm:mb-16 sm:flex-row sm:items-center sm:justify-between sm:py-12"
      >
        <div>
          <p className="text-muted-green text-xs tracking-[0.16em] uppercase">
            Bring everyone together
          </p>
          <h2 className="text-estate-green mt-2 font-serif text-2xl">
            Weddings and offsites
          </h2>
        </div>
        <p className="text-foreground/70 max-w-md text-sm leading-6">
          Lawns for weddings and offsites.{" "}
          <Link
            className="border-copper text-estate-green border-b"
            href="/events"
          >
            Share your event details
          </Link>
          .
        </p>
      </section>

      <footer className="border-line text-muted-green border-t py-5 text-xs">
        Wildfern Estate · Chikkamagaluru, Karnataka
      </footer>
    </main>
  );
}

function futureDate(offset: number): string {
  return new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
}
