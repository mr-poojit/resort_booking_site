import Image from "next/image";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { EventEnquiryForm } from "@/components/guest-workflows";

export default function EventsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-360 px-5 sm:px-8 lg:px-14">
      <header className="border-line flex min-h-20 items-center justify-between border-b">
        <BrandMark />
        <Link className="text-estate-green text-sm underline" href="/stays">
          Stay booking
        </Link>
      </header>
      <section className="grid gap-10 py-10 lg:grid-cols-[0.8fr_1.2fr] lg:py-16">
        <div className="space-y-6">
          <p className="text-muted-green text-xs tracking-[0.15em] uppercase">
            Weddings and offsites
          </p>
          <h1 className="text-estate-green mt-3 font-serif text-4xl">
            Bring everyone together.
          </h1>
          <p className="text-foreground/70 mt-4 max-w-md text-sm leading-7">
            Share a few details and the team will follow up. This form creates
            an enquiry in the shared inbox; it does not quote or confirm event
            pricing.
          </p>
          <figure className="relative aspect-[1.3] overflow-hidden rounded-sm bg-[#dfe5dc]">
            <Image
              src="/images/gatherings.jpg"
              alt="Illustrative wedding detail photograph; not a photograph of the resort."
              fill
              loading="eager"
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="object-cover"
            />
            <figcaption className="bg-soft-white/90 text-estate-green absolute right-3 bottom-3 px-3 py-2 text-[10px] tracking-[0.12em] uppercase">
              Illustrative wedding detail
            </figcaption>
          </figure>
        </div>
        <EventEnquiryForm />
      </section>
      <footer className="border-line text-muted-green border-t py-5 text-xs">
        <Link className="underline" href="/privacy">
          Privacy notice
        </Link>
      </footer>
    </main>
  );
}
